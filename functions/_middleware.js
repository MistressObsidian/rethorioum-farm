export async function onRequest(context) {
  let path;
  try { path = decodeURIComponent(new URL(context.request.url).pathname).replace(/\/{2,}/g,'/'); }
  catch { return new Response('Invalid path', {status:400}); }
  if (path.split('/').some(part => part.startsWith('.')) || /^\/(backend|tests|scripts)(\/|$)/.test(path) || /\.(md|sql|jsonc|toml|log)$/i.test(path)) return new Response('Not found', {status:404});
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','strict-origin-when-cross-origin'); headers.set('X-Frame-Options','DENY');
  if (path.startsWith('/admin') || path.startsWith('/api/')) {headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');}
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
