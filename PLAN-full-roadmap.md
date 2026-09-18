# mapsnearme — Full Roadmap (All Phases)

**For:** AI coding agents (Antigravity) + the human owner. Branch: `antigravity-build`.
**One-line goal:** India's premium verified business directory — an almost exact clone of the locked Vercel design, live on Cloudflare free tier (~₹0), with a vinext dashboard, near-me search, and SEO/ads flywheel.

**STANDING RULES (owner-mandated):**
1. **All databases in India region** — Supabase = Mumbai (ap-south-1); Cloudflare D1 = `--location apac` (India is not offered for D1, apac/Singapore is the closest allowed); KV = global edge (no region concept). Never create a DB in a US/EU region.
2. **Naming convention:** every resource name identifies its type — D1 databases end with `-db` (e.g. `pincode-india-db`, `mapsnearme-db`), KV namespaces end with `_KV` (e.g. `SESSION_KV`, `MAPSNEARME_ADS_KV`).

---

## 0. Design reference — CLONE THIS

The design is LOCKED to these two Vercel preview sites. Every new page (search, near-me, about, dashboard) must look like it belongs to the same product:

- **https://skm-studio-map.vercel.app** — primary reference (mapsnearme look)
- **https://skm-studio-maps.vercel.app** — secondary reference (variations)

Key traits (already implemented in this repo — reuse, don't reinvent): deep-black background (`--bg #050506`), gold accent (`--gold #d9a53c`), gold pill badge ("● Pre-Launch — Exclusive Access"), serif display (Fraunces) + sans body (Plus Jakarta Sans), search pill with 2 inputs + gold "Search Now" button, 4-col stats row, 6-col category grid, 3-col verified business cards, 4-col footer. Tokens live in `src/styles/global.css`; components in `src/layouts/BaseLayout.astro` + `src/components/BizCard.astro`.

Screenshots of the reference design: `digipincode-india` repo, branch `design-captures`, folder `/design/` (map-desktop, map-mobile, maps-desktop, maps-mobile, live-*).

## 1. Databases & APIs (reference sheet)

### Supabase — PRIMARY (live data now)
- Project: **timnrnmmmmuqmcnuaend** → `https://timnrnmmmmuqmcnuaend.supabase.co` (org ldsvadevtoylphvmxtel)
- Access from this site: **PostGREST REST API with the anon key** (read-only; already set as Cloudflare Pages env vars `SUPABASE_URL` + `SUPABASE_ANON_KEY`). NEVER use the service-role key in this repo.
- Tables: `cities` (id, name, slug, state), `categories` (id, name, slug, icon), `businesses` (id, name, slug, address, pin_code, latitude, longitude, phone, whatsapp, website, description, tagline, avg_rating, review_count, logo_url, cover_url, is_verified, is_featured, city_id, category_id)
- **RPC: `nearby_businesses`** — PostGIS stored function (lat/lng -> nearby listings) for /near-me
- Tables reserved for Phase 2 (dashboard, RLS-protected): `leads`, `feedback`, `leaderboard_scores`
- All access goes through `src/lib/data.ts` — the ONLY file that talks to the DB (swap-friendly later)
- Secondary project `mapsnearme` (ref hfmkznptehdhtgsuwzri) exists for a future migration — do NOT use it yet. If ever recreated, choose the **Mumbai (ap-south-1)** region.

### Cloudflare (all free tier; apac region, -db/_KV naming)
- Pages: `mapsnearme` → **https://mapsnearme.pages.dev** (this repo; env vars already set), `dashboardmapsnearme` (dashboard repo, Phase 2)
- Worker (reverse proxy): `mapsnearme` → **https://mapsnearme.india-in.workers.dev** (custom domain later)
- D1 `mapsnearme-db` (id 03a74322-da9e-485d-af1c-e73249d19039, **apac**) — reserved for ads + internal analytics events (old empty `mapsnearme` DB deleted)
- KV `MAPSNEARME_ADS_KV` (id 5d3d1232c58e489c8aa016664ca22820) — ad slot content cache (replaces old MAPSNEARME_ADS)
- KV `SESSION_KV` (id 5356a2ee926848c3a705d1c94d9a542f) — Astro Cloudflare adapter sessions (binding name stays `SESSION` in wrangler.jsonc)
- D1 `pincode-india-db` (id 74274a3f-9fca-42ec-9fbf-c707ffbc56a4, **apac**) — belongs to the **digipincode-india** repo (see cross-links); being seeded via the d1-apply workflow. The old `pincode-india` DB (wnam) stays live only until the apac DB is fully seeded, then the Worker binding flips and the old DB is deleted.
- **Deploy:** this repo has NO Cloudflare secrets. Deploys happen via `bootstrap-mapsnearme.yml` in the digipincode-india repo (workflow_dispatch). Do not attempt to deploy from here.

### Partner site
- **digipincode** (pincode/village/DigiPIN directory) → https://digipincode.india-in.workers.dev — repo `digipincode-india`. Its D1 has all-India pincodes + village lists (populated from our KB datasets). Cross-link everything (WS4 of PLAN-phase3.md).

## 2. Analytics plan (internal + external)

Goal: know what users search and click, then feed it back into content.

1. **Cloudflare Web Analytics** (free, cookie-less, no consent banner): enable for mapsnearme.pages.dev in the CF dashboard (owner action), add the beacon script in `BaseLayout.astro` head.
2. **GA4** (owner creates property "mapsnearme", sends us the Measurement ID `G-XXXXXXX`): add gtag in BaseLayout with the ID from a `PUBLIC_GA_ID` env var (empty = skip, so no local noise). Custom events to implement on top:
   - `search_query` {q, loc} — on /search results view
   - `near_me_used` {radius} — geolocation granted
   - `listing_view` {business_id, category, city} — /b/[id]
   - `contact_click` {business_id, type: call|whatsapp|website|direction}
   - `category_browse` / `city_browse` — category/city pages
3. **Google Search Console**: verify mapsnearme.pages.dev (owner action; GSC account already in use), submit `/sitemap.xml`, monitor queries. Monthly: export GSC queries → they become the keyword priority list for new city/category content (same loop as the pincode site's `seo/gsc-pincode-keywords.csv`).
4. **Internal event log** (Phase 2+): D1 table `events` in `mapsnearme-db` (type, business_id, meta, created_at) written via a small `/api/track` endpoint — powers "trending near you" and business-owner lead quality signals. Keep writes tiny; respect free-tier limits.

## 3. Phases

### Phase 0 — Fixes — ✅ DONE
Adapter 5/12 downgrade (404 fix), SESSION KV binding, env vars, working Pages deploy.

### Phase 1 — Real data + premium redesign — ✅ DONE
Supabase live data (158 businesses / 32 cities / 16 categories), dark+gold premium UI live on mapsnearme.pages.dev.

### Phase 3 — Search, near-me, SEO — 🔨 SCAFFOLDED (current branch, see PLAN-phase3.md)
/search (fixes the homepage 404), /near-me (PostGIS RPC), sitemap.xml, about/privacy/terms, digipincode cross-links.

### Phase 2 — Dashboard (repo: dashboardmapsnearme, vinext/Next.js)
- Supabase Auth (email magic link) for business owners
- Claim-a-listing flow (verify phone/OTP later), edit listing, upload logo (Supabase Storage — free, replaces the dropped R2 plan)
- Leads inbox (table `leads`), feedback moderation (`feedback`), local leaderboard (`leaderboard_scores`) — all RLS: owners see only their rows
- Mount on CF Pages `dashboardmapsnearme`; same dark+gold design language

### Phase 4 — SEO & content flywheel
- Sitemaps submitted to GSC; internal linking city↔category↔business↔pincode(digipincode)
- skm-ai-worker AI summaries/descriptions for thin listings (Workers AI, free tier)
- Keyword-driven city/category landing pages (GSC data loop, same as digipincode)
- Structured data: LocalBusiness JSON-LD on /b/[id], BreadcrumbList everywhere

### Phase 5 — Monetize
- Ad slots served from KV `MAPSNEARME_ADS_KV` (self-serve, no third-party dependency at first)
- Google AdSense once traffic justifies it (privacy page already ready)
- Featured/verified business subscriptions via the dashboard (leads + leaderboard as proof)

## 4. Rules (recap — full list in AGENTS.md)
- Astro 5 + adapter ^12 LOCKED. Design LOCKED. data.ts is the only DB file. Free tier only. No data.gov.in / attribution-required datasets. Deploy only from main merge via the digipincode-india repo workflows.
- Databases only in India region (Supabase Mumbai / D1 apac), names end with -db or _KV.
