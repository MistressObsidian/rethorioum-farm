import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
test('navigation targets exist and all static references resolve',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate element IDs');
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(match[1]),'Missing section '+match[1]);
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const path=match[1];if(/^(?:https?:|tel:|#)/.test(path))continue;assert(existsSync(resolve(root,'.'+(path.startsWith('/')?path:'/'+path))),'Missing file '+path);}
});
test('the Pages domain and structured metadata remain valid',()=>{
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert(schema['@graph'].every(item=>item.url==='https://rethorioum-farm.pages.dev'));
  assert(!html.includes('https://rethoriumfarm.com'));assert(!html.includes('20+'));assert(!html.includes('100%'));assert(!html.includes('200+'));
});
test('catalogue fallback has no invented prices or stock promises, and gallery assets exist',()=>{
  const context={window:{}};vm.runInNewContext(readFileSync(resolve(root,'farm-data.js'),'utf8'),context);vm.runInNewContext(readFileSync(resolve(root,'gallery/media-data.js'),'utf8'),context);
  assert.equal(context.window.farmData.products.length,6);assert(context.window.farmData.products.every(p=>p.price===null&&p.availability==='enquiry'));
  for(const item of [...context.window.farmData.products,...context.window.galleryMedia]){const path=item.image||item.src;if(path)assert(existsSync(resolve(root,path)));}
  for(const file of ['app.js','admin/admin.js'])new vm.Script(readFileSync(resolve(root,file),'utf8'));
});
