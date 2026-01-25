/**
 * Fetch URL and parse JSON. Uses response.text() then JSON.parse because:
 * - Hermes has incomplete URLSearchParams; we avoid any polyfill scope.
 * - Player API can return non-JSON (e.g. "error", "expired", HTML).
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
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
  } catch {
    throw new Error(`Invalid JSON: ${t.slice(0, 80)}`);
  }
}
