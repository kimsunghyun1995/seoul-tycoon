/**
 * CORS proxy wrapper for API calls.
 * In development, uses Vite proxy directly.
 * In production (GitHub Pages), uses corsproxy.io CORS proxy.
 */

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

export async function fetchWithCorsProxy(url: string): Promise<Response> {
  if (import.meta.env.DEV) {
    return fetch(url)
  }

  // Try each proxy in order until one succeeds
  let lastError: Error | null = null
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const response = await fetch(makeProxyUrl(url))
      if (response.ok) return response
      if (response.status === 429) {
        lastError = new Error(`Rate limited (429)`)
        continue
      }
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error('All CORS proxies failed')
}

/** Delay helper for rate-limiting in production */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
