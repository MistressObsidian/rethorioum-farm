const API_ORIGIN = 'https://rethorium-farm-catalogue.muddy-truth-c7b9.workers.dev';
export async function onRequest(context) {
  const source = new URL(context.request.url);
  const target = new URL(source.pathname + source.search, API_ORIGIN);
  try {
    const request = new Request(target, context.request);
    const response = await fetch(request, {redirect:'manual',signal:AbortSignal.timeout(12000)});
    return new Response(response.body, {status:response.status,headers:response.headers});
  } catch {
    return Response.json({error:'The catalogue service could not be reached. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
