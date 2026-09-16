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

export async function getCities(Astro: EnvLike): Promise<City[]> {
  const r = await sb(Astro, 'cities?select=id,name,slug,state&order=name.asc');
  if (!r || !r.ok) return [];
  return (await r.json()) as City[];
}

export async function getCityBySlug(Astro: EnvLike, slug: string): Promise<City | null> {
  const r = await sb(Astro, `cities?select=id,name,slug,state&slug=eq.${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return null;
  const rows = (await r.json()) as City[];
  return rows[0] ?? null;
}

export async function getCategories(Astro: EnvLike): Promise<Category[]> {
  const r = await sb(Astro, 'categories?select=id,name,slug,icon&order=name.asc');
  if (!r || !r.ok) return [];
  return (await r.json()) as Category[];
}

export async function getCategoryBySlug(Astro: EnvLike, slug: string): Promise<Category | null> {
  const r = await sb(Astro, `categories?select=id,name,slug,icon&slug=eq.${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return null;
  const rows = (await r.json()) as Category[];
  return rows[0] ?? null;
}

const BIZ_SELECT =
  'id,name,slug,address,pin_code,latitude,longitude,phone,whatsapp,website,description,tagline,avg_rating,review_count,logo_url,cover_url,is_verified,is_featured,city:cities(name,slug),category:categories(name,slug)';

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
