import "@supabase/functions-js/edge-runtime.d.ts"

const SEOUL_API_BASE = "http://openapi.seoul.go.kr:8088"
const SEOUL_API_KEY = Deno.env.get("SEOUL_API_KEY") ?? ""

// In-memory cache: key → { data, expiry }
const cache = new Map<string, { data: string; expiry: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Fetch a single area from Seoul API with caching
async function fetchSeoulData(path: string): Promise<string> {
  const cached = cache.get(path)
  if (cached && Date.now() < cached.expiry) return cached.data

  const seoulUrl = `${SEOUL_API_BASE}/${SEOUL_API_KEY}/json/${path}`
  const response = await fetch(seoulUrl)
  const data = await response.text()

  cache.set(path, { data, expiry: Date.now() + CACHE_TTL_MS })
  return data
}

// Evict expired cache entries
function evictExpired() {
  if (cache.size > 300) {
    const now = Date.now()
    for (const [key, val] of cache) {
      if (now > val.expiry) cache.delete(key)
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.replace(/^\/seoul-proxy\/?/, "").replace(/^\//, "")

    // ── BULK endpoint: POST /seoul-proxy/bulk ──────────────
    // Body: { areas: ["홍대입구", "강남역", ...] }
    // Returns: { results: { "홍대입구": {...}, "강남역": {...} } }
    if (pathParts === "bulk" && req.method === "POST") {
      const body = await req.json()
      const areas: string[] = body?.areas ?? []

      if (areas.length === 0) {
        return new Response(JSON.stringify({ results: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Fetch all areas in parallel (server-side, no CORS issues)
      const BATCH_SIZE = 10
      const results: Record<string, unknown> = {}

      for (let i = 0; i < areas.length; i += BATCH_SIZE) {
        const batch = areas.slice(i, i + BATCH_SIZE)
        const settled = await Promise.allSettled(
          batch.map(async (area) => {
            const path = `citydata/1/5/${encodeURIComponent(area)}`
            const data = await fetchSeoulData(path)
            return { area, data }
          })
        )

        for (const result of settled) {
          if (result.status === "fulfilled") {
            try {
              results[result.value.area] = JSON.parse(result.value.data)
            } catch {
              results[result.value.area] = null
            }
          }
        }
      }

      evictExpired()

      return new Response(JSON.stringify({ results }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
        },
      })
    }

    // ── Single endpoint: GET /seoul-proxy/citydata/1/5/홍대입구 ──
    if (!pathParts) {
      return new Response(
        JSON.stringify({ error: "Path required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const data = await fetchSeoulData(pathParts)
    const isCacheHit = cache.has(pathParts) && Date.now() < (cache.get(pathParts)?.expiry ?? 0)

    evictExpired()

    return new Response(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": isCacheHit ? "HIT" : "MISS",
        "Cache-Control": "public, max-age=600",
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
