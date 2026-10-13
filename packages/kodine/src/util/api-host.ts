// Central Kodine API host. api.kodine.net is proxied to kodine.net, so every
// path that works on kodine.net works identically on api.kodine.net.
export const API_BASE = "https://api.kodine.net"
export const API_FALLBACK = "https://kodine.net"

/**
 * Fetch a Kodine API path, preferring the central API host and falling back
 * to the website origin on transport failure (DNS/TLS) or 5xx responses.
 * 4xx responses are definitive and returned without retrying.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const primary = await fetch(`${API_BASE}${path}`, init).catch(() => undefined)
  if (primary && primary.status < 500) return primary
  return fetch(`${API_FALLBACK}${path}`, init)
}
