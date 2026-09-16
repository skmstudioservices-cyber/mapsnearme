# mapsnearme — India Local Business Directory

JustDial-alternative on 100% free tier: **Astro + Cloudflare Pages + Supabase (PostGIS) + Leaflet/OSM**.

- **Live:** https://mapsnearme.pages.dev (proxy: https://mapsnearme.india-in.workers.dev)
- **Dashboard repo:** `dashboardmapsnearme` (Next.js via vinext) — proxied at `/dashboard`
- **Full plan & resources:** Notion → "CF JustDial Maps — Full Stack Build Plan" → child page "mapsnearme — Live Links"

## Architecture (scalable by design)

```
src/
├── layouts/BaseLayout.astro   # container: head-slot injection (JSON-LD/meta/analytics per page), header/footer, design tokens
├── components/               # reusable: BizCard, MapView (Leaflet+OSM)...
├── lib/data.ts               # ⭐ DATA LAYER — ONLY file that touches the DB. Supabase→D1 swap = sirf yahi file change hogi
└── pages/                    # route templates: /, /city/[slug], /category/[slug], /b/[id]
```

- Per-page `<script slot="head">` = WordPress-style head/body injection, compile-time safe
- Design tokens CSS variables mein — theming ek jagah
- Pincode/DigiPIN pages digipincode site pe cross-link hote hain (duplicate nahi)

## Env vars (CF Pages → Settings → Environment variables)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Dev

```bash
npm install
npm run dev
```

## Deploy

Push to `main` → GitHub Actions → `wrangler pages deploy dist --project-name=mapsnearme` (CF secrets chahiye repo mein: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
