/**
 * CORS proxy wrapper for API calls.
 * In development, uses Vite proxy.
 * In production (GitHub Pages), uses allorigins CORS proxy service.
 */
export async function fetchWithCorsProxy(url: string): Promise<Response> {
  if (import.meta.env.DEV) {
    // In dev, use Vite proxy
    return fetch(url)
  }

  // In production, use allorigins CORS proxy service
  const corsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  const response = await fetch(corsUrl)

  if (!response.ok) {
    throw new Error(`CORS proxy error: ${response.status}`)
  }

  const data = await response.json()

  // allorigins returns { contents: string, status: number, ... }
  // contents is a JSON string, so parse it
  const jsonString = typeof data.contents === 'string' ? data.contents : JSON.stringify(data.contents)

  return new Response(jsonString, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
