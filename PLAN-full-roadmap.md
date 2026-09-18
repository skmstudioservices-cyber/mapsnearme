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
- KV `MAPSNEARME_ADS_KV` (id 5d3d1232c58e489c8aa016664ca22820) — ad slot content cache (binding added 18 Sep — AdSlot component reads `ad:<slot>` keys)
- KV `SESSION_KV` (id 5356a2ee926848c3a705d1c94d9a542f) — Astro Cloudflare adapter sessions (binding name stays `SESSION` in wrangler.jsonc; fixed 18 Sep — was pointing at a deleted namespace)
- D1 `pincode-india-db` (id 74274a3f-9fca-42ec-9fbf-c707ffbc56a4, **apac**) — belongs to the **digipincode-india** repo (see cross-links); seeded via the d1-apply workflow.
- **Deploy:** THIS repo's own `deploy.yml` runs on every push to main (CF secrets set 18 Sep — CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in Actions secrets). ~40s per deploy. The bridge workflow `mapsnearme-deploy.yml` in the digipincode-india repo remains as backup.

### Partner site
- **digipincode** (pincode/village/DigiPIN directory) → https://digipincode.india-in.workers.dev — repo `digipincode-india`. Its D1 has all-India pincodes + village lists. Cross-linked (city pages → digipincode/city, business pages → digipincode/pincode).

## 2. Analytics plan (internal + external)

Goal: know what users search and click, then feed it back into content.

1. **Cloudflare Web Analytics** (free, cookie-less, no consent banner): enable for mapsnearme.pages.dev in the CF dashboard (owner action), add the beacon script in `BaseLayout.astro` head.
2. **GA4** (owner creates property "mapsnearme", sends us the Measurement ID `G-XXXXXXX`): add gtag in BaseLayout with the ID from a `PUBLIC_GA_ID` env var (empty = skip, so no local noise). Custom events to implement on top:
   - `search_query` {q, loc} — on /search results view
   - `near_me_used` {radius} — geolocation granted
   - `listing_view` {business_id, category, city} — /b/[id]
   - `contact_click` {business_id, type: call|whatsapp|website|direction}
   - `category_browse` / `city_browse` — category/city pages
3. **Google Search Console**: ✅ DONE 18 Sep — verified + /sitemap.xml submitted.
4. **Internal event log** (Phase 2+): D1 table `events` in `mapsnearme-db` (type, business_id, meta, created_at) written via a small `/api/track` endpoint — powers "trending near you" and business-owner lead quality signals. Keep writes tiny; respect free-tier limits.

## 3. Phases

### Phase 0 — Fixes — ✅ DONE
Adapter 5/12 downgrade (404 fix), SESSION KV binding, env vars, working Pages deploy.

### Phase 1 — Real data + premium redesign — ✅ DONE
Supabase live data (158 businesses / 32 cities / 16 categories), dark+gold premium UI live on mapsnearme.pages.dev.

### Phase 3 — Search, near-me, SEO — ✅ DONE (18 Sep)
Merged antigravity-build → main, auto-deployed. /search (200), /near-me, /sitemap.xml (200, submitted to GSC), about/privacy/terms, digipincode cross-links.

### Phase 4 — SEO & content flywheel — ✅ CORE DONE (18 Sep)
- ✅ Sitemap submitted to GSC; internal linking city↔category↔business↔search (combo links: "/search?q=Category&loc=City") + digipincode cross-links
- ✅ Structured data: LocalBusiness JSON-LD on /b/[id], BreadcrumbList + ItemList JSON-LD on city/category pages
- ✅ Related same-city businesses on /b/[id]
- ⏳ skm-ai-worker AI summaries for thin listings (Workers AI) — next
- ⏳ Keyword-driven city/category landing pages (GSC data loop) — ongoing as data arrives

### Phase 5 — Monetize — 🔨 SCAFFOLDED (18 Sep)
- ✅ AdSlot component live on city/category/business pages — serves from KV `MAPSNEARME_ADS_KV` (set via `wrangler kv key put --namespace-id=5d3d1232c58e489c8aa016664ca22820 "ad:<slot>" '{...json}'`; slots: city-top, category-top, listing-bottom)
- ⏳ Google AdSense once traffic justifies it (privacy page ready)
- ⏳ Featured/verified business subscriptions via the dashboard (Phase 2 dependency)

### Phase 2 — Dashboard (repo: dashboardmapsnearme, vinext/Next.js) — ⏳ PENDING (next big build)
- Supabase Auth (email magic link) for business owners
- Claim-a-listing flow (verify phone/OTP later), edit listing, upload logo (Supabase Storage — free, replaces the dropped R2 plan)
- Leads inbox (table `leads`), feedback moderation (`feedback`), local leaderboard (`leaderboard_scores`) — all RLS: owners see only their rows
- Mount on CF Pages `dashboardmapsnearme`; same dark+gold design language

## 4. Rules (recap — full list in AGENTS.md)
- Astro 5 + adapter ^12 LOCKED. Design LOCKED. data.ts is the only DB file. Free tier only. No data.gov.in / attribution-required datasets. Deploys run from this repo's own deploy.yml on push to main (secrets set); digipincode-india repo workflows are backup.
- Databases only in India region (Supabase Mumbai / D1 apac), names end with -db or _KV.
