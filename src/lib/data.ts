// ============================================================
// mapsnearme DATA LAYER — the ONLY file that touches the database.
// Scalability rule: pages/components never call fetch() directly.
// Future swap (Supabase -> D1/Hyperdrive) = only this file changes.
// ============================================================

export interface City {
  id: string; name: string; slug: string; state?: string | null;
}
export interface Category {
  id: string; name: string; slug: string; icon?: string | null;
}
export interface Business {
  id: string; name: string; slug: string;
  address?: string | null; pin_code?: string | null;
  latitude?: number | null; longitude?: number | null;
  phone?: string | null; whatsapp?: string | null; website?: string | null;
  description?: string | null; tagline?: string | null;
  avg_rating?: number | null; review_count?: number | null;
  logo_url?: string | null; cover_url?: string | null;
  is_verified?: boolean; is_featured?: boolean;
  city?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
}

// Astro context (locals.runtime.env on CF) or plain import.meta.env at build time
type EnvLike = { locals?: { runtime?: { env?: Record<string, string | undefined> } } } | undefined;

function getEnv(Astro: EnvLike, key: string): string {
  try {
    const runtimeEnv = Astro?.locals?.runtime?.env;
    if (runtimeEnv && runtimeEnv[key]) return runtimeEnv[key] as string;
  } catch { /* not in a worker runtime */ }
  return (import.meta.env as Record<string, string | undefined>)[key] ?? '';
}

export function dataReady(Astro: EnvLike): boolean {
  return Boolean(getEnv(Astro, 'SUPABASE_URL') && getEnv(Astro, 'SUPABASE_ANON_KEY'));
}

async function sb(
  Astro: EnvLike,
  path: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const base = getEnv(Astro, 'SUPABASE_URL');
  const key = getEnv(Astro, 'SUPABASE_ANON_KEY');
  if (!base || !key) return null;
  try {
    return await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return null;
  }
}

// ----------------------------------------------------------
// Cities & categories
// ----------------------------------------------------------

export async function getCities(Astro: EnvLike): Promise<City[]> {
  const r = await sb(Astro, 'cities?select=id,name,slug&order=name');
  if (!r || !r.ok) return [];
  return (await r.json()) as City[];
}

export async function getCityBySlug(Astro: EnvLike, slug: string): Promise<City | null> {
  const r = await sb(Astro, `cities?select=id,name,slug&slug=eq.${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return null;
  const rows = (await r.json()) as City[];
  return rows[0] ?? null;
}

export async function getCategories(Astro: EnvLike): Promise<Category[]> {
  const r = await sb(Astro, 'categories?select=id,name,slug&order=name');
  if (!r || !r.ok) return [];
  return (await r.json()) as Category[];
}

export async function getCategoryBySlug(Astro: EnvLike, slug: string): Promise<Category | null> {
  const r = await sb(Astro, `categories?select=id,name,slug&slug=eq.${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return null;
  const rows = (await r.json()) as Category[];
  return rows[0] ?? null;
}

// ----------------------------------------------------------
// Businesses
// ----------------------------------------------------------

const BIZ_SELECT = `*,
  city:cities ( name, slug ),
  category:categories ( name, slug )`;

export async function getBusinesses(
  Astro: EnvLike,
  opts: { citySlug?: string; categorySlug?: string; limit?: number } = {}
): Promise<Business[]> {
  const limit = opts.limit ?? 24;
  let q = `businesses?select=${BIZ_SELECT}&order=is_verified.desc,avg_rating.desc.nullslast&limit=${limit}`;

  // filters via joins need ids, so resolve slugs first
  if (opts.citySlug) {
    const city = await getCityBySlug(Astro, opts.citySlug);
    if (!city) return [];
    q += `&city_id=eq.${city.id}`;
  }
  if (opts.categorySlug) {
    const cat = await getCategoryBySlug(Astro, opts.categorySlug);
    if (!cat) return [];
    q += `&category_id=eq.${cat.id}`;
  }

  const r = await sb(Astro, q);
  if (!r || !r.ok) return [];
  return (await r.json()) as Business[];
}

export async function getBusinessById(Astro: EnvLike, id: string): Promise<Business | null> {
  const r = await sb(Astro, `businesses?select=${BIZ_SELECT}&id=eq.${encodeURIComponent(id)}`);
  if (!r || !r.ok) return null;
  const rows = (await r.json()) as Business[];
  return rows[0] ?? null;
}

// "Near me" — PostGIS radius search (RPC on Supabase)
export async function searchBusinessesNear(
  Astro: EnvLike,
  lat: number,
  lng: number,
  radiusMeters = 3000
): Promise<Business[]> {
  const body = JSON.stringify({ lat, lng, radius_m: radiusMeters });
  const r = await sb(Astro, 'rpc/nearby_businesses', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!r || !r.ok) return [];
  const rows = (await r.json()) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    ...row,
    city: undefined,
    category: undefined,
  })) as unknown as Business[];
}

// Alias per PLAN-phase3.md WS2
export const getNearbyBusinesses = searchBusinessesNear;

// WS1: Search businesses by query text and optional location
export async function searchBusinesses(
  Astro: EnvLike,
  opts: { q?: string; loc?: string; limit?: number } = {}
): Promise<Business[]> {
  const limit = opts.limit ?? 48;
  let query = `businesses?select=${BIZ_SELECT}&order=is_verified.desc,avg_rating.desc.nullslast&limit=${limit}`;

  if (opts.q && opts.q.trim()) {
    const term = encodeURIComponent(`*${opts.q.trim()}*`);
    query += `&or=(name.ilike.${term},tagline.ilike.${term},description.ilike.${term})`;
  }

  if (opts.loc && opts.loc.trim()) {
    const locTerm = opts.loc.trim();
    // Resolve against cities first
    const rCity = await sb(Astro, `cities?select=id&name=ilike.*${encodeURIComponent(locTerm)}*&limit=1`);
    if (rCity && rCity.ok) {
      const matchedCities = (await rCity.json()) as Array<{ id: string }>;
      if (matchedCities.length > 0 && matchedCities[0]?.id) {
        query += `&city_id=eq.${matchedCities[0].id}`;
      }
    }
  }

  const r = await sb(Astro, query);
  if (!r || !r.ok) return [];
  return (await r.json()) as Business[];
}

// Exact total count via PostGREST Prefer: count=exact (content-range header)
export async function countBusinesses(Astro: EnvLike): Promise<number> {
  const r = await sb(Astro, 'businesses?select=id&limit=1', {
    headers: { Prefer: 'count=exact' },
  });
  if (!r || !r.ok) return 0;
  const cr = r.headers.get('content-range'); // e.g. "0-0/158"
  const total = cr?.split('/')[1];
  return total ? Number(total) || 0 : 0;
}

// Paged id fetch for the sitemap — PostGREST caps rows per request,
// so the sitemap pages through all businesses in chunks (order=id is
// stable across pages which matters for correctness of the paging loop).
export async function getBusinessIdsPaged(
  Astro: EnvLike,
  offset: number,
  limit = 1000
): Promise<Array<{ id: string }>> {
  const r = await sb(
    Astro,
    `businesses?select=id&order=id&limit=${limit}&offset=${offset}`
  );
  if (!r || !r.ok) return [];
  return (await r.json()) as Array<{ id: string }>;
}
