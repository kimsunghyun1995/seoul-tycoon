import "@supabase/functions-js/edge-runtime.d.ts"

const SEOUL_API_BASE = "http://openapi.seoul.go.kr:8088"
const SEOUL_API_KEY = Deno.env.get("SEOUL_API_KEY") ?? ""

// In-memory cache: key → { data, expiry }
const cache = new Map<string, { data: string; expiry: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    // Path: /seoul-proxy/citydata/1/5/홍대입구
    // Path: /seoul-proxy/culturalEventInfo/1/1000
    const pathParts = url.pathname
      .replace(/^\/seoul-proxy\/?/, "")
      .replace(/^\//, "")

    if (!pathParts) {
      return new Response(
        JSON.stringify({ error: "Path required. e.g., /seoul-proxy/citydata/1/5/홍대입구" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check cache
    const cached = cache.get(pathParts)
    if (cached && Date.now() < cached.expiry) {
      return new Response(cached.data, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "Cache-Control": "public, max-age=300",
        },
      })
    }

    // Fetch from Seoul API
    const seoulUrl = `${SEOUL_API_BASE}/${SEOUL_API_KEY}/json/${pathParts}`
    const response = await fetch(seoulUrl)
    const data = await response.text()

    // Cache the response
    cache.set(pathParts, { data, expiry: Date.now() + CACHE_TTL_MS })

    // Evict expired entries
    if (cache.size > 200) {
      const now = Date.now()
      for (const [key, val] of cache) {
        if (now > val.expiry) cache.delete(key)
      }
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
