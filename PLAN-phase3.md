# mapsnearme — Phase 3 Build Plan (search, near-me, SEO, cross-links)

**For:** AI coding agent (Antigravity) on branch `antigravity-build`.
**Stack:** Astro 5 + @astrojs/cloudflare ^12 (LOCKED), Cloudflare Pages (mapsnearme.pages.dev), Supabase PostGREST via `src/lib/data.ts`.
**Design:** premium dark + gold — locked. Match `src/pages/index.astro` + `src/styles/global.css` exactly.

Existing routes: `/`, `/city/[slug]`, `/category/[slug]`, `/b/[id]`.
Existing data helpers in `src/lib/data.ts`: `getCities`, `getCityBySlug`, `getCategories`, `getCategoryBySlug`, `getBusinesses({citySlug, categorySlug, limit})`, `getBusinessById`, `countBusinesses`, `dataReady`.
Supabase also has a PostGIS RPC `nearby_businesses` (lat/lng based) — verify its exact parameter names via the existing PostGREST patterns before calling.

---

## WS1 — Search page (URGENT — homepage form posts to /search which is currently 404)

The homepage form (`src/pages/index.astro`) submits GET to `/search` with fields `q` (text) and `loc` (location text).

**Create `src/pages/search.astro`:**
1. Read `q` and `loc` from `Astro.url.searchParams`.
2. Add `searchBusinesses(Astro, { q, loc, limit })` to `src/lib/data.ts`:
   - q → PostGREST `or=(name.ilike.*q*,tagline.ilike.*q*,description.ilike.*q*)` on `businesses`
   - loc → resolve against cities first (`cities?name=ilike.*loc*` or exact slug match), then filter `city_id=eq.<id>`; if loc doesn't match any city, ignore the loc filter rather than returning zero results
   - order: `is_verified.desc,avg_rating.desc.nullslast`, limit 48
3. Page sections: the same search pill (copy from index.astro, pre-filled with q/loc), result count, results grid using `BizCard`, empty state ("No results for X" + popular categories + top cities links).
4. SSR everything. `<title>`: `{q || 'Search'}{loc ? ' in ' + loc : ''} — mapsnearme`. Add canonical, meta description, og: tags via BaseLayout props if supported.

## WS2 — Near-me page

**Create `src/pages/near-me.astro`:**
1. Add `getNearbyBusinesses(Astro, lat, lng, limit)` to `src/lib/data.ts` — POST to `/rest/v1/rpc/nearby_businesses` with the coords. First check the RPC's signature (try a call pattern consistent with `sb()`; if the RPC name/params differ, adjust).
2. Page: "Find Businesses Near Me" heading, "Use my location" gold button (browser Geolocation API → fetch the results server-side is NOT possible — so: Geolocation → redirect to `/near-me?lat=..&lng=..` which SSR-renders nearby results).
3. Show distance (if RPC returns it) + `BizCard` grid, deep-linking to `/b/{id}`.
4. Fallback (no coords / permission denied): popular cities links + the search form.

## WS3 — Sitemap + SEO pages

**Create `src/pages/sitemap.xml.ts`:**
- Endpoint returning valid XML: static routes (`/`, `/near-me`, `/search`, `/about`, `/privacy`, `/terms`), all `/city/{slug}` (getCities), all `/category/{slug}` (getCategories), and business pages `/b/{id}` (fetch `businesses?select=id` paginated by 1000; cap sitemap at 50k URLs — chunk into sitemap index later only if needed).
- Note: data.ts helpers take an Astro-like env; for endpoints use `import.meta.env` (see `getEnv()` fallback in data.ts).

**Create `src/pages/about.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`:**
- Static content, BaseLayout, premium design, footer links added in BaseLayout.
- Privacy policy must include cookies/analytics/third-party ads sections (AdSense-ready) — generic, honest content for an India business directory.
- Update `public/robots.txt` (this file MAY be edited): allow all, add `Sitemap: https://mapsnearme.pages.dev/sitemap.xml`.

## WS4 — Cross-linking with digipincode

- In `src/pages/city/[slug].astro`, add a section "Pincodes in {City}" linking to `https://digipincode.india-in.workers.dev/city/{slug}` (and a generic link to the digipincode homepage in the footer via BaseLayout, labelled "Pin Codes India").
- On `/b/[id]`, if the business has `pin_code`, link to `https://digipincode.india-in.workers.dev/pincode/{pin_code}`.

## Files created in this scaffold (fill in, don't relocate)

```
AGENTS.md
PLAN-phase3.md
src/pages/search.astro
src/pages/near-me.astro
src/pages/sitemap.xml.ts
src/pages/about.astro
src/pages/privacy.astro
src/pages/terms.astro
```
Plus edits you will make: `src/lib/data.ts` (+searchBusinesses, +getNearbyBusinesses), `src/layouts/BaseLayout.astro` (footer links), `public/robots.txt` (sitemap line).

## Verification

1. `npm install && npm run build` passes; `dist/_worker.js/` exists.
2. `astro dev` locally with env vars in `.env` (see `.env.example` — SUPABASE_URL / SUPABASE_ANON_KEY):
   - `/search?q=cafe&loc=delhi` renders BizCards or a clean empty state
   - `/search` with no params shows a friendly prompt + popular categories
   - `/near-me` without coords shows fallback; `?lat=28.6&lng=77.2` renders results (if RPC works)
   - `/sitemap.xml` returns valid XML
3. Push to `antigravity-build` only. The user merges to main — the deploy workflow (`bootstrap-mapsnearme.yml` in the digipincode-india repo) handles deployment. Do not attempt deploys yourself.
