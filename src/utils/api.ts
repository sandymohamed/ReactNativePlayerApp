import { withRequestTimeout } from './requestTimeout';
// src/utils/api.ts

/**
 * Parse JSON and report a safe error when a server returns invalid data.
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  return withRequestTimeout(async signal => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`IPTV server returned HTTP ${res.status}.`);
    try {
      return await res.json() as T;
    } catch {
      throw new Error('The IPTV server returned invalid JSON.');
    }
  });
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
