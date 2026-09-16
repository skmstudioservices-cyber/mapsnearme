import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// mapsnearme — Astro public site (Cloudflare Pages, SSR via Cloudflare adapter)
// Proxy: mapsnearme.india-in.workers.dev -> this site; /dashboard -> dashboardmapsnearme
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://mapsnearme.pages.dev',
});
