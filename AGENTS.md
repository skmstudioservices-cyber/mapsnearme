# AGENTS.md — rules for AI coding agents (Antigravity) in this repo

## First: read the plan
`PLAN-phase3.md` (repo root) is the single source of truth for the current build.

## Workflow
- Work on branch `antigravity-build` — do NOT commit to main.
- Build in workstream order: WS1 search page (URGENT — the homepage form posts to /search which is currently a 404) → WS2 near-me → WS3 sitemap + SEO pages → WS4 cross-links.
- `npm install && npm run build` must pass before every push; `dist/_worker.js/index.js` must exist after build.
- Small, focused commits. Never force-push.
- Scaffold files with `TODO(Antigravity)` headers already exist — fill them in; do not relocate or delete them.

## Hard constraints
- **Astro 5 + @astrojs/cloudflare ^12 is LOCKED.** Never upgrade Astro or the adapter (adapter 14+ emits a Workers-only layout and breaks this Cloudflare Pages deploy). Do not touch `astro.config.mjs`, `package.json` version pins, `wrangler.jsonc`.
- **Design is LOCKED**: premium dark + gold (see `src/styles/global.css` design tokens and `src/pages/index.astro`). New pages MUST match this design exactly — same tokens, same card styles (`BizCard.astro`), same navbar/footer (`BaseLayout.astro`). No new CSS frameworks.
- **Data layer rule**: pages/components NEVER call fetch() directly. All Supabase queries go through `src/lib/data.ts` (that file is the only thing that touches the database). Add new functions there (searchBusinesses, getNearbyBusinesses, etc.) following its existing style (PostGREST via the private `sb()` helper).
- Supabase PostGREST + RPC only (anon key, read-only). No service-role key anywhere.
- **FREE TIER ONLY.** No R2, no paid Cloudflare features.
- SSR everywhere — search results render on the server; geolocation is progressive enhancement.
- Do not touch `.github/` (workflows) or any other repo. Deploy happens only after the user merges to main.

## Model settings (for the human driving Antigravity)
- Planning / task breakdown: Gemini 3 Pro (Agent Manager), thinking ON (high).
- Astro pages & components (templated work): Claude Sonnet 4.5 (Artifacts), thinking OFF.
- PostGREST query logic, tricky debugging: Claude Opus 4.5 (Artifacts), thinking ON.
- Mechanical work (sitemap entries, meta tags, formatting): Gemini Flash, thinking OFF.
