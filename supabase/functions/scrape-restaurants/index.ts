import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN") ?? ""
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? ""
const KAKAO_KEY = Deno.env.get("KAKAO_REST_API_KEY") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const AD_KEYWORDS = ["광고", "협찬", "제공", "원고료", "체험단", "sponsored", "#ad", "partnership"]
const HASHTAGS = ["서울맛집", "핫플", "서울핫플", "줄서는맛집", "요즘맛집"]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// ── Apify Instagram Hashtag Scraper ──────────────────────
async function scrapeInstagram(): Promise<any[]> {
  const input = {
    hashtags: HASHTAGS,
    resultsLimit: 50,
    searchType: "hashtag",
  }

  // Start actor run
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  const runData = await runRes.json()
  const runId = runData?.data?.id
  if (!runId) return []

  // Wait for completion (poll every 10s, max 5min)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    const statusData = await statusRes.json()
    if (statusData?.data?.status === "SUCCEEDED") break
    if (statusData?.data?.status === "FAILED") return []
  }

  // Get results
  const dataRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`
  )
  return await dataRes.json()
}

// ── Apify Threads Scraper ────────────────────────────────
async function scrapeThreads(): Promise<any[]> {
  const input = {
    searchQueries: ["서울 맛집", "서울 핫플 맛집"],
    maxItems: 50,
    searchType: "keyword",
  }

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/apify~meta-threads-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  const runData = await runRes.json()
  const runId = runData?.data?.id
  if (!runId) return []

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    const statusData = await statusRes.json()
    if (statusData?.data?.status === "SUCCEEDED") break
    if (statusData?.data?.status === "FAILED") return []
  }

  const dataRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=100`
  )
  return await dataRes.json()
}

// ── Filter ads ───────────────────────────────────────────
function isAd(text: string): boolean {
  const lower = text.toLowerCase()
  return AD_KEYWORDS.some(kw => lower.includes(kw))
}

// ── Extract restaurant names from text (heuristic) ───────
function extractRestaurantCandidates(text: string): string[] {
  const candidates: string[] = []

  // Pattern 1: 【식당명】 or [식당명]
  const bracketMatches = text.match(/[【\[][^【\[\]】]+[】\]]/g)
  if (bracketMatches) {
    candidates.push(...bracketMatches.map(m => m.replace(/[【】\[\]]/g, "").trim()))
  }

  // Pattern 2: "OO식당", "OO카페", "OO집" etc
  const namePatterns = text.match(/[가-힣A-Za-z0-9]{2,15}(?:식당|카페|집|정|당|숍|키친|레스토랑|버거|피자|스시|라멘|국밥|곱창|삼겹|치킨)/g)
  if (namePatterns) candidates.push(...namePatterns)

  // Pattern 3: @mentions that could be restaurant accounts
  const mentions = text.match(/@([a-z0-9_.]{3,30})/gi)
  if (mentions) {
    // Filter out common non-restaurant mentions
    candidates.push(...mentions.map(m => m.replace("@", "")).filter(m => !m.includes("_official")))
  }

  return [...new Set(candidates)].slice(0, 3) // Max 3 candidates per post
}

// ── Kakao Local: restaurant name → coordinates ───────────
async function geocodeRestaurant(name: string): Promise<{
  name: string; address: string; lat: number; lng: number; category: string
} | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name + " 서울")}&category_group_code=FD6&size=1`
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  })
  const data = await res.json()
  const doc = data?.documents?.[0]
  if (!doc) return null

  return {
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || "",
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    category: doc.category_name?.split(" > ").pop() ?? "",
  }
}

// ── Google Places: get rating ────────────────────────────
async function getGoogleRating(name: string, lat: number, lng: number): Promise<{
  rating: number; reviewCount: number; placeId: string
} | null> {
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
    `input=${encodeURIComponent(name)}&inputtype=textquery` +
    `&locationbias=point:${lat},${lng}` +
    `&fields=place_id,rating,user_ratings_total` +
    `&key=${GOOGLE_API_KEY}`

  const res = await fetch(url)
  const data = await res.json()
  const place = data?.candidates?.[0]
  if (!place) return null

  return {
    rating: place.rating ?? 0,
    reviewCount: place.user_ratings_total ?? 0,
    placeId: place.place_id ?? "",
  }
}

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    console.log("Starting restaurant scraping...")

    // Step 1: Scrape Instagram + Threads in parallel
    const [instaPosts, threadsPosts] = await Promise.all([
      scrapeInstagram().catch(() => []),
      scrapeThreads().catch(() => []),
    ])

    console.log(`Instagram: ${instaPosts.length}, Threads: ${threadsPosts.length}`)

    // Step 2: Extract restaurant candidates
    const mentionCounts = new Map<string, { instagram: number; threads: number; sources: string[] }>()

    // Process Instagram posts
    for (const post of instaPosts) {
      const caption = post?.caption ?? post?.text ?? ""
      if (isAd(caption)) continue

      const twoWeeksAgo = Date.now() - 14 * 86400000
      const postDate = new Date(post?.timestamp ?? post?.takenAtTimestamp * 1000 ?? 0).getTime()
      if (postDate < twoWeeksAgo) continue

      const candidates = extractRestaurantCandidates(caption)
      for (const name of candidates) {
        const existing = mentionCounts.get(name) ?? { instagram: 0, threads: 0, sources: [] }
        existing.instagram++
        if (post?.url) existing.sources.push(post.url)
        mentionCounts.set(name, existing)
      }
    }

    // Process Threads posts
    for (const post of threadsPosts) {
      const text = post?.text ?? post?.caption ?? ""
      if (isAd(text)) continue

      const candidates = extractRestaurantCandidates(text)
      for (const name of candidates) {
        const existing = mentionCounts.get(name) ?? { instagram: 0, threads: 0, sources: [] }
        existing.threads++
        if (post?.url) existing.sources.push(post.url)
        mentionCounts.set(name, existing)
      }
    }

    console.log(`Unique restaurant candidates: ${mentionCounts.size}`)

    // Step 3: Filter — take top candidates by mention count
    const trending = [...mentionCounts.entries()]
      .filter(([name, _]) => name.length >= 2 && !/^[0-9@#]/.test(name))
      .sort((a, b) => (b[1].instagram + b[1].threads) - (a[1].instagram + a[1].threads))
      .slice(0, 40) // Top 40 candidates

    console.log(`Trending (2+ mentions): ${trending.length}`)

    // Step 4: Geocode + Google rating for each
    const restaurants = []
    for (const [candidateName, counts] of trending) {
      // Geocode
      const geo = await geocodeRestaurant(candidateName)
      if (!geo) continue

      // Seoul bounds check
      if (geo.lat < 37.42 || geo.lat > 37.70 || geo.lng < 126.76 || geo.lng > 127.18) continue

      // Google rating
      const google = await getGoogleRating(geo.name, geo.lat, geo.lng).catch(() => null)

      restaurants.push({
        name: geo.name,
        address: geo.address,
        lat: geo.lat,
        lng: geo.lng,
        google_rating: google?.rating ?? null,
        google_review_count: google?.reviewCount ?? 0,
        google_place_id: google?.placeId ?? null,
        instagram_mentions: counts.instagram,
        threads_mentions: counts.threads,
        source_urls: counts.sources.slice(0, 5),
        trending_score: counts.instagram * 2 + counts.threads,
        category: geo.category,
        updated_at: new Date().toISOString(),
      })

      // Rate limit
      await new Promise(r => setTimeout(r, 200))
    }

    // Step 4b: Fallback — if scraping yielded few results, use Kakao to find popular restaurants in hot areas
    if (restaurants.length < 10) {
      console.log("Few scrape results, fetching popular restaurants from Kakao Local...")
      const hotAreas = ["홍대 맛집", "성수 맛집", "강남 맛집", "이태원 맛집", "망원 맛집",
        "을지로 맛집", "연남동 맛집", "합정 맛집", "신사 맛집", "잠실 맛집",
        "여의도 맛집", "건대 맛집", "명동 맛집", "압구정 맛집", "서촌 맛집"]

      for (const query of hotAreas) {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&sort=accuracy&size=3`
        const res = await fetch(url, {
          headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
        })
        const data = await res.json()
        for (const doc of (data?.documents ?? [])) {
          const lat = parseFloat(doc.y)
          const lng = parseFloat(doc.x)
          if (lat < 37.42 || lat > 37.70 || lng < 126.76 || lng > 127.18) continue
          if (restaurants.some(r => r.name === doc.place_name)) continue

          const google = await getGoogleRating(doc.place_name, lat, lng).catch(() => null)
          restaurants.push({
            name: doc.place_name,
            address: doc.road_address_name || doc.address_name || "",
            lat, lng,
            google_rating: google?.rating ?? null,
            google_review_count: google?.reviewCount ?? 0,
            google_place_id: google?.placeId ?? null,
            instagram_mentions: mentionCounts.get(doc.place_name)?.instagram ?? 0,
            threads_mentions: mentionCounts.get(doc.place_name)?.threads ?? 0,
            source_urls: [],
            trending_score: (mentionCounts.get(doc.place_name)?.instagram ?? 0) * 2 +
              (google?.reviewCount ?? 0 > 500 ? 3 : 1),
            category: doc.category_name?.split(" > ").pop() ?? "",
            updated_at: new Date().toISOString(),
          })
          await new Promise(r => setTimeout(r, 150))
        }
      }
      console.log(`After Kakao fallback: ${restaurants.length} restaurants`)
    }

    console.log(`Restaurants with coordinates: ${restaurants.length}`)

    // Step 5: Upsert to Supabase
    if (restaurants.length > 0) {
      // Clear old data and insert fresh
      await supabase.from("hot_restaurants").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      const { error } = await supabase.from("hot_restaurants").insert(restaurants)
      if (error) console.error("Insert error:", error)
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          instagramPosts: instaPosts.length,
          threadsPosts: threadsPosts.length,
          candidates: mentionCounts.size,
          saved: restaurants.length,
        },
        restaurants: restaurants.map(r => ({ name: r.name, score: r.trending_score, rating: r.google_rating })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Scrape error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
