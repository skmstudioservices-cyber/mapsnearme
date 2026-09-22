// GET /sitemap.xml — Dynamic XML Sitemap (WS3)
// 2026-09-22: business listing pages now paginated (PostGREST caps ~1000
// rows per request, so we page through getBusinessIdsPaged until exhausted).
import { getCities, getCategories, getBusinessIdsPaged } from '../lib/data';

export async function GET(context: any): Promise<Response> {
  const baseUrl = 'https://mapsnearme.pages.dev';

  // 1. Static routes
  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/near-me`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/search`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/terms`, priority: '0.3', changefreq: 'monthly' },
  ];

  // 2. Fetch dynamic routes
  const [cities, categories] = await Promise.all([
    getCities(context),
    getCategories(context),
  ]);

  const cityUrls = cities.map((c) => ({
    loc: `${baseUrl}/city/${encodeURIComponent(c.slug)}`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  const categoryUrls = categories.map((c) => ({
    loc: `${baseUrl}/category/${encodeURIComponent(c.slug)}`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  // 3. Business listing pages — paged, includes every business the site lists
  const businessUrls: Array<{ loc: string; priority: string; changefreq: string }> = [];
  const PAGE = 1000;
  const HARD_CAP = 30000; // safety cap
  for (let offset = 0; offset < HARD_CAP; offset += PAGE) {
    const ids = await getBusinessIdsPaged(context, offset, PAGE);
    for (const b of ids) {
      businessUrls.push({
        loc: `${baseUrl}/b/${b.id}`,
        priority: '0.6',
        changefreq: 'weekly',
      });
    }
    if (ids.length < PAGE) break;
  }

  // Combine and format
  const allUrls = [...staticUrls, ...cityUrls, ...categoryUrls, ...businessUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc.replace(/&/g, '&')}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
