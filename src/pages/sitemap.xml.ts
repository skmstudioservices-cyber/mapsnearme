// GET /sitemap.xml — Dynamic XML Sitemap (WS3)
import { getCities, getCategories } from '../lib/data';

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

  // Combine and format
  const allUrls = [...staticUrls, ...cityUrls, ...categoryUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>
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
