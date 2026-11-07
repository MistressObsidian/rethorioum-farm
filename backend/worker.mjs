const IDS = ['roots', 'leafy', 'grains', 'fruits', 'herbs', 'bulk'];
const UNITS = ['kg', 'bag', 'crate', 'box'];
const STATUSES = ['enquiry', 'available', 'unavailable'];
const COOKIE = '__Host-rf_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const decode = value => Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
async function bodyJSON(request, max = 12000) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Send JSON data.');
  if (!request.body) fail(400, 'Missing request data.');
  const reader = request.body.getReader(); const chunks = []; let length = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; length += value.byteLength; if (length > max) { await reader.cancel(); fail(413, 'Request too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { const body = JSON.parse(new TextDecoder().decode(bytes)); if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'Invalid JSON data.'); return body; } catch { fail(400, 'Invalid JSON data.'); }
}
function checkOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) fail(403, 'Please use the farm administration page.');
  let parsed; try { parsed = new URL(origin); } catch { fail(403, 'Invalid origin.'); }
  const host = parsed.hostname;
  if (parsed.protocol !== 'https:' || !(origin === new URL(request.url).origin || host === 'rethorioum-farm.pages.dev' || host.endsWith('.rethorioum-farm.pages.dev'))) fail(403, 'This origin is not allowed.');
}
function sessionToken(request) { return request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1); }
async function requireSession(request, env) {
  const token = sessionToken(request); if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) fail(401, 'Please sign in.');
  const hash = await digest(token);
  const session = await env.DB.prepare('SELECT expires FROM sessions WHERE token_hash = ?').bind(hash).first();
  if (!session || session.expires <= Date.now()) fail(401, 'Your session has ended. Please sign in again.');
  return hash;
}
async function passwordMatches(password, configText) {
  const config = JSON.parse(configText);
  if (config.iterations !== 100000 || typeof config.salt !== 'string' || typeof config.hash !== 'string') throw Error('Invalid password configuration');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const candidate = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:decode(config.salt), iterations:config.iterations}, key, 256);
  const expectedKey = await crypto.subtle.importKey('raw', decode(config.hash), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const candidateKey = await crypto.subtle.importKey('raw', candidate, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const message = encoder.encode('Rethorium Farm administrator password verification');
  return crypto.subtle.verify('HMAC', expectedKey, await crypto.subtle.sign('HMAC', candidateKey, message), message);
}
const productJSON = row => ({id:row.id,price:row.price_cents == null ? null : row.price_cents / 100,unit:row.unit,availability:row.availability,version:row.version});
async function catalogue(env) {
  const [products, delivery] = await Promise.all([env.DB.prepare('SELECT id, price_cents, unit, availability, version FROM products ORDER BY rowid').all(), env.DB.prepare('SELECT delivery, collection, minimum, version FROM settings WHERE id = 1').first()]);
  return { products: products.results.map(productJSON), delivery };
}
function priceInCents(value) {
  if (value === null || value === '') return null;
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) fail(400, 'Enter a positive price with up to two decimal places, or leave it blank.');
  const [whole, fraction = ''] = String(value).split('.'); const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0 || cents > 1000000000) fail(400, 'Price must be between ₦0.01 and ₦10,000,000.'); return cents;
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    try {
      if (path === '/api/health' && request.method === 'GET') { await env.DB.prepare('SELECT 1 AS ok').first(); return json({ok:true}); }
      if (path === '/api/catalog' && request.method === 'GET') return json(await catalogue(env));
      if (!path.startsWith('/api/admin/')) return json({error:'Not found.'},404);
      if (!['GET','POST','PUT'].includes(request.method)) return json({error:'Method not allowed.'},405,{Allow:'GET, POST, PUT'});
      if (request.method !== 'GET') checkOrigin(request);
      if (path === '/api/admin/login' && request.method === 'POST') {
        if (!env.ADMIN_PASSWORD_HASH) return json({error:'Administration is not configured yet.'},503);
        const body = await bodyJSON(request, 2048);
        if (typeof body.password !== 'string' || body.password.length > 256) fail(400, 'Enter your administrator password.');
        const now = Date.now(), window = Math.floor(now / 900000);
        const bucket = await digest((request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + window);
        const attempt = await env.DB.prepare('SELECT failures FROM login_attempts WHERE bucket = ?').bind(bucket).first();
        if (attempt?.failures >= 5) return json({error:'Too many sign-in attempts. Try again in 15 minutes.'},429,{'Retry-After':'900'});
        if (!await passwordMatches(body.password, env.ADMIN_PASSWORD_HASH)) {
          await env.DB.batch([env.DB.prepare('INSERT INTO login_attempts (bucket, failures, expires) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET failures = failures + 1').bind(bucket,now+900000),env.DB.prepare('DELETE FROM login_attempts WHERE expires < ?').bind(now)]);
          return json({error:'The password is incorrect.'},401);
        }
        const token = randomToken(); const hash = await digest(token);
        await env.DB.batch([env.DB.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').bind(hash,now+SESSION_MS),env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now),env.DB.prepare('DELETE FROM login_attempts WHERE bucket = ?').bind(bucket)]);
        return json({ok:true},200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; Max-Age=28800; Secure; HttpOnly; SameSite=Strict`});
      }
      const hash = await requireSession(request,env);
      if (path === '/api/admin/session' && request.method === 'GET') return json({authenticated:true});
      if (path === '/api/admin/catalog' && request.method === 'GET') return json(await catalogue(env));
      if (path === '/api/admin/logout' && request.method === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run(); return json({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`}); }
      const productId = path.match(/^\/api\/admin\/products\/([a-z]+)$/)?.[1];
      if (productId && request.method === 'PUT') {
        if (!IDS.includes(productId)) fail(404,'Product not found.');
        const body = await bodyJSON(request);
        if (!UNITS.includes(body.unit) || !STATUSES.includes(body.availability) || !Number.isInteger(body.version) || body.version < 1) fail(400,'Invalid product details. Refresh the page and try again.');
        const price = priceInCents(body.price);
        const result = await env.DB.prepare('UPDATE products SET price_cents = ?, unit = ?, availability = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(price,body.unit,body.availability,new Date().toISOString(),productId,body.version).run();
        if (result.meta.changes !== 1) fail(409,'This item was updated in another session. Refresh before saving your changes.');
        return json({product:productJSON(await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first())});
      }
      if (path === '/api/admin/delivery' && request.method === 'PUT') {
        const body = await bodyJSON(request);
        if (!Number.isInteger(body.version) || body.version < 1) fail(400,'Refresh the delivery information before saving.');
        for (const key of ['delivery','collection','minimum']) if (typeof body[key] !== 'string' || body[key].trim().length < 5 || body[key].length > 500) fail(400,'Each delivery field must contain between 5 and 500 characters.');
        const result = await env.DB.prepare('UPDATE settings SET delivery = ?, collection = ?, minimum = ?, version = version + 1 WHERE id = 1 AND version = ?').bind(body.delivery.trim(),body.collection.trim(),body.minimum.trim(),body.version).run();
        if (result.meta.changes !== 1) fail(409,'Delivery information changed in another session. Refresh before saving.');
        return json({delivery:await env.DB.prepare('SELECT delivery, collection, minimum, version FROM settings WHERE id = 1').first()});
      }
      return json({error:'Not found.'},404);
    } catch(error) {
      if (error.status) return json({error:error.message},error.status);
      console.error(JSON.stringify({event:'catalogue_error',path,type:error.name}));
      return json({error:'The catalogue service is temporarily unavailable. Please try again.'},503);
    }
  }
};
