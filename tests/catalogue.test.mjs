import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import worker from '../backend/worker.mjs';
const origin='https://rethorioum-farm.pages.dev';
const password='A test password, never used in production.';
function fixture() {
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../backend/migrations/0001_catalogue.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){let values=[];const statement=sqlite.prepare(sql);const prepared={bind(...args){values=args;return prepared;},async first(){return statement.get(...values)??null;},async all(){return {results:statement.all(...values)};},async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}};return prepared;},async batch(statements){const results=[];for(const statement of statements)results.push(await statement.run());return results;}};
  const salt=Buffer.from('test-salt-16bytes');
  const env={DB,ADMIN_PASSWORD_HASH:JSON.stringify({salt:salt.toString('base64'),hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64'),iterations:100000})};
  async function request(path,{method='GET',body,cookie,requestOrigin=origin}={}){return worker.fetch(new Request('https://test.workers.dev'+path,{method,headers:{'Content-Type':'application/json','Origin':requestOrigin,...(cookie?{Cookie:cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);}
  return {request,sqlite};
}
test('public catalogue starts with null prices and unconfirmed availability',async()=>{const {request,sqlite}=fixture();try{const response=await request('/api/catalog');assert.equal(response.status,200);const body=await response.json();assert.equal(body.products.length,6);assert(body.products.every(p=>p.price===null&&p.availability==='enquiry'));assert.equal(response.headers.get('Cache-Control'),'no-store');}finally{sqlite.close();}});
test('admin requires a valid session, rejects cross-site changes, and revokes logout sessions',async()=>{const {request,sqlite}=fixture();try{
  assert.equal((await request('/api/admin/catalog')).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password},requestOrigin:'https://untrusted.example'})).status,403);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'wrong'}})).status,401);
  const login=await request('/api/admin/login',{method:'POST',body:{password}});assert.equal(login.status,200);
  const setCookie=login.headers.get('Set-Cookie');assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('Secure'));assert(setCookie.includes('SameSite=Strict'));const cookie=setCookie.split(';')[0];
  assert.equal((await request('/api/admin/catalog',{cookie})).status,200);
  assert.equal((await request('/api/admin/logout',{method:'POST',body:{},cookie})).status,200);
  assert.equal((await request('/api/admin/catalog',{cookie})).status,401);
}finally{sqlite.close();}});
test('prices validate, save in minor units, prevent stale overwrites and can be cleared to null',async()=>{const {request,sqlite}=fixture();try{
  const login=await request('/api/admin/login',{method:'POST',body:{password}}),cookie=login.headers.get('Set-Cookie').split(';')[0];
  for(const price of [-1,0,'1.234','invalid'])assert.equal((await request('/api/admin/products/roots',{method:'PUT',cookie,body:{price,unit:'kg',availability:'enquiry',version:1}})).status,400);
  assert.equal((await request('/api/admin/products/roots',{method:'PUT',body:{price:1200,unit:'kg',availability:'available',version:1}})).status,401);
  const saved=await request('/api/admin/products/roots',{method:'PUT',cookie,body:{price:'1234.56',unit:'bag',availability:'available',version:1}});assert.equal(saved.status,200);assert.equal((await saved.json()).product.price,1234.56);
  assert.equal((await request('/api/admin/products/roots',{method:'PUT',cookie,body:{price:2,unit:'kg',availability:'available',version:1}})).status,409);
  assert.equal((await request('/api/admin/products/roots',{method:'PUT',cookie,body:{price:null,unit:'kg',availability:'enquiry',version:2}})).status,200);
  const catalogue=await(await request('/api/catalog')).json();assert.equal(catalogue.products.find(p=>p.id==='roots').price,null);
}finally{sqlite.close();}});
test('repeated failed sign-in attempts are limited',async()=>{const {request,sqlite}=fixture();try{for(let n=0;n<5;n++)assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'wrong'}})).status,401);assert.equal((await request('/api/admin/login',{method:'POST',body:{password}})).status,429);}finally{sqlite.close();}});
test('delivery edits validate and prevent stale changes',async()=>{const {request,sqlite}=fixture();try{const login=await request('/api/admin/login',{method:'POST',body:{password}}),cookie=login.headers.get('Set-Cookie').split(';')[0];const body={delivery:'Delivery subject to confirmation.',collection:'Contact us before collecting.',minimum:'Ask about minimum quantities.',version:1};assert.equal((await request('/api/admin/delivery',{method:'PUT',body,cookie})).status,200);assert.equal((await request('/api/admin/delivery',{method:'PUT',body,cookie})).status,409);assert.equal((await request('/api/admin/delivery',{method:'PUT',body:{...body,version:2,delivery:''},cookie})).status,400);}finally{sqlite.close();}});
