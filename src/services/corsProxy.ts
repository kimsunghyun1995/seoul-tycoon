/**
 * API proxy layer.
 * - DEV: Vite proxy (/api/seoul)
 * - PROD: Supabase Edge Function (seoul-proxy)
 * - Fallback: corsproxy.io (if Supabase not configured)
 */

// Supabase Edge Function URL — set via VITE_SUPABASE_URL env var
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

/**
 * Get the base URL for Seoul API calls.
 * In dev: /api/seoul/{apiKey}/json/...
 * In prod: {SUPABASE_URL}/functions/v1/seoul-proxy/... (no API key needed, server handles it)
 */
export function getSeoulApiBase(): { base: string; includeApiKey: boolean } {
  if (import.meta.env.DEV) {
    return { base: '/api/seoul', includeApiKey: true }
  }

  if (SUPABASE_URL) {
    return { base: `${SUPABASE_URL}/functions/v1/seoul-proxy`, includeApiKey: false }
  }

  // Fallback: direct URL + CORS proxy
  return { base: 'http://openapi.seoul.go.kr:8088', includeApiKey: true }
}

/**
 * Fetch with automatic CORS proxy fallback (only used when Supabase is not configured).
 */
export async function fetchWithCorsProxy(url: string): Promise<Response> {
  if (import.meta.env.DEV || SUPABASE_URL) {
    // Dev uses Vite proxy, Supabase handles CORS natively
    return fetch(url)
  }

  // Fallback: CORS proxy services
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ]

  let lastError: Error | null = null
  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl)
      if (response.ok) return response
      if (response.status === 429) { lastError = new Error('Rate limited'); continue }
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError ?? new Error('All CORS proxies failed')
}

/** Delay helper for rate-limiting */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
