// TODO(Antigravity): implement per PLAN-phase3.md — WS3
// GET /sitemap.xml — valid XML sitemap.
// 1. Static routes: /, /near-me, /search, /about, /privacy, /terms
// 2. /city/{slug} for every city (getCities), /category/{slug} for every category (getCategories)
// 3. /b/{id} for business pages: businesses?select=id paginated by 1000 (add a helper
//    to data.ts if needed); cap at 50k URLs total for now
// 4. data.ts helpers take an Astro-like env — for endpoints pass undefined and rely on
//    the import.meta.env fallback (see getEnv() in data.ts)
// 5. Return with content-type application/xml; escape & in URLs (&)
export async function GET(): Promise<Response> {
  // TODO(Antigravity)
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
    headers: { 'content-type': 'application/xml' },
  });
}
