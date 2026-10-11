/**
 * Fetch URL and parse JSON. Uses response.text() then JSON.parse because:
 * - Hermes has incomplete URLSearchParams; we avoid any polyfill scope.
 * - Player API can return non-JSON (e.g. "error", "expired", HTML).
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  console.log('fetchJson response status:', res.status, res, 'for URL:', url);
  const text = await res.text();
  const t = (text && text.trim()) || '';
  if (!t) {
    throw new Error('Empty response');
  }
  const first = t.charAt(0);
  if (first !== '[' && first !== '{') {
    throw new Error(`Expected JSON, got: ${t.slice(0, 80)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (error){
    console.error('Error parsing JSON:', error, 'Response text:', t);
    throw new Error(`Invalid JSON: ${t.slice(0, 80)}`);
  }
}

export type CategoryLike = { category_id: string; category_name: string; [k: string]: unknown };

/** Normalize API response to category array (handles raw array or { categories }). */
export function normalizeCategories(raw: unknown): CategoryLike[] {
  if (Array.isArray(raw)) return raw as CategoryLike[];
  const o = raw as { categories?: unknown };
  if (o?.categories && Array.isArray(o.categories)) return o.categories as CategoryLike[];
  return [];
}

/** Normalize API response to streams array (handles raw array or { streams }). */
export function normalizeStreams(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const o = raw as { streams?: unknown };
  if (o?.streams && Array.isArray(o.streams)) return o.streams;
  return [];
}
