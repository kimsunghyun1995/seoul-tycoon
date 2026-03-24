import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN") ?? ""
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? ""
const KAKAO_KEY = Deno.env.get("KAKAO_REST_API_KEY") ?? ""
const AAC_API_KEY = Deno.env.get("AAC_API_KEY") ?? ""
const AAC_API_BASE = Deno.env.get("AAC_API_BASE") ?? "https://namc-aigw.io.naver.com/v1/"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const HASHTAGS = ["서울맛집", "핫플", "서울핫플", "줄서는맛집", "요즘맛집"]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// ── Apify: run actor and wait for results ────────────────
async function runApifyActor(actorId: string, input: unknown, maxWaitSec = 300): Promise<any[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
  )
  const runData = await runRes.json()
  const runId = runData?.data?.id
  if (!runId) { console.error(`Actor ${actorId} failed to start:`, runData); return [] }

  for (let i = 0; i < maxWaitSec / 10; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const s = (await statusRes.json())?.data?.status
    if (s === "SUCCEEDED") break
    if (s === "FAILED" || s === "ABORTED") return []
  }

  const dataRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`
  )
  return await dataRes.json()
}

// ── Scrape Instagram ─────────────────────────────────────
async function scrapeInstagram(): Promise<{ text: string; url: string; isPaid: boolean }[]> {
  const posts = await runApifyActor("apify~instagram-hashtag-scraper", {
    hashtags: HASHTAGS, resultsLimit: 50, searchType: "hashtag",
  })
  return posts.map(p => ({
    text: p?.caption ?? p?.text ?? "",
    url: p?.url ?? p?.shortCode ? `https://instagram.com/p/${p.shortCode}` : "",
    isPaid: !!p?.isPaidPartnership,
  }))
}

// ── Scrape Threads ───────────────────────────────────────
async function scrapeThreads(): Promise<{ text: string; url: string; isPaid: boolean }[]> {
  const posts = await runApifyActor("igview-owner~threads-search-scraper", {
    searchQuery: "서울 맛집", maxResults: 50,
  })
  return posts.map(p => ({
    text: p?.captionText ?? p?.text ?? "",
    url: p?.postUrl ?? "",
    isPaid: p?.isPaidPartnership === "True" || p?.isPaidPartnership === true,
  }))
}

// ── LLM: extract restaurants + emoji + filter ads ────────
async function llmExtractRestaurants(posts: { text: string; url: string; source: string }[]): Promise<{
  name: string; emoji: string; reason: string; source: string; sourceUrl: string; isAd: boolean
}[]> {
  if (!AAC_API_KEY || posts.length === 0) return []

  // Batch posts into chunks of 20 for LLM
  const results: any[] = []
  for (let i = 0; i < posts.length; i += 20) {
    const batch = posts.slice(i, i + 20)
    const postsText = batch.map((p, idx) =>
      `[${idx + 1}] (${p.source}) ${p.text.slice(0, 300)}`
    ).join("\n\n")

    const prompt = `다음은 서울 맛집 관련 SNS 게시글들입니다. 각 게시글에서:
1. 실제 식당 이름을 추출하세요 (없으면 skip)
2. 광고/협찬인지 판단하세요
3. 해당 음식 종류에 맞는 이모지 1개를 선택하세요 (🍜🍣🍕🍔🍲🥘🍖🥩🍝🍛🥟🍱🍰☕🍺🥗🌮🍗 등)
4. 한줄 추천 이유를 작성하세요

JSON 배열로만 응답하세요. 다른 텍스트 없이:
[{"postIndex": 1, "restaurantName": "식당명", "isAd": false, "emoji": "🍜", "reason": "추천 이유"}]

식당명이 없는 게시글은 배열에 포함하지 마세요.

게시글:
${postsText}`

    try {
      const res = await fetch(`${AAC_API_BASE}chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AAC_API_KEY}`,
        },
        body: JSON.stringify({
          model: "Qwen3-32B",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      })

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content ?? ""

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        for (const item of parsed) {
          if (!item.restaurantName || item.isAd) continue
          const postIdx = (item.postIndex ?? 1) - 1
          const post = batch[postIdx]
          results.push({
            name: item.restaurantName,
            emoji: item.emoji ?? "🍽️",
            reason: item.reason ?? "",
            source: post?.source ?? "unknown",
            sourceUrl: post?.url ?? "",
            isAd: !!item.isAd,
          })
        }
      }
    } catch (err) {
      console.error("LLM error:", err)
    }

    await new Promise(r => setTimeout(r, 1000)) // Rate limit
  }
  return results
}

// ── Kakao Local: restaurant name → coordinates ───────────
async function geocodeRestaurant(name: string): Promise<{
  name: string; address: string; lat: number; lng: number; category: string
} | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name + " 서울")}&category_group_code=FD6&size=1`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
  const data = await res.json()
  const doc = data?.documents?.[0]
  if (!doc) return null
  return {
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || "",
    lat: parseFloat(doc.y), lng: parseFloat(doc.x),
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
    `&fields=place_id,rating,user_ratings_total&key=${GOOGLE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const place = data?.candidates?.[0]
  if (!place) return null
  return { rating: place.rating ?? 0, reviewCount: place.user_ratings_total ?? 0, placeId: place.place_id ?? "" }
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
    const [instaRaw, threadsRaw] = await Promise.all([
      scrapeInstagram().catch(e => { console.error("Instagram error:", e); return [] }),
      scrapeThreads().catch(e => { console.error("Threads error:", e); return [] }),
    ])

    console.log(`Instagram: ${instaRaw.length}, Threads: ${threadsRaw.length}`)

    // Filter out paid partnerships early
    const instaPosts = instaRaw.filter(p => !p.isPaid && p.text.length > 10)
    const threadsPosts = threadsRaw.filter(p => !p.isPaid && p.text.length > 10)

    // Step 2: LLM extraction
    const allPosts = [
      ...instaPosts.map(p => ({ ...p, source: "instagram" as string })),
      ...threadsPosts.map(p => ({ ...p, source: "threads" as string })),
    ]

    let llmResults = await llmExtractRestaurants(allPosts)
    console.log(`LLM extracted: ${llmResults.length} restaurants`)

    // Step 3: Aggregate by restaurant name
    const restaurantMap = new Map<string, {
      emoji: string; reason: string;
      instagram: number; threads: number; sources: string[]
    }>()

    for (const r of llmResults) {
      const existing = restaurantMap.get(r.name) ?? { emoji: r.emoji, reason: r.reason, instagram: 0, threads: 0, sources: [] }
      if (r.source === "instagram") existing.instagram++
      else existing.threads++
      if (r.sourceUrl) existing.sources.push(r.sourceUrl)
      if (!existing.emoji || existing.emoji === "🍽️") existing.emoji = r.emoji
      restaurantMap.set(r.name, existing)
    }

    // Step 4: Geocode + Google rating
    const restaurants: any[] = []
    const sorted = [...restaurantMap.entries()].sort((a, b) =>
      (b[1].instagram + b[1].threads) - (a[1].instagram + a[1].threads)
    ).slice(0, 30)

    for (const [name, info] of sorted) {
      const geo = await geocodeRestaurant(name)
      if (!geo) continue
      if (geo.lat < 37.42 || geo.lat > 37.70 || geo.lng < 126.76 || geo.lng > 127.18) continue

      const google = await getGoogleRating(geo.name, geo.lat, geo.lng).catch(() => null)

      restaurants.push({
        name: geo.name, address: geo.address, lat: geo.lat, lng: geo.lng,
        google_rating: google?.rating ?? null,
        google_review_count: google?.reviewCount ?? 0,
        google_place_id: google?.placeId ?? null,
        instagram_mentions: info.instagram,
        threads_mentions: info.threads,
        source_urls: info.sources.slice(0, 5),
        trending_score: info.instagram * 2 + info.threads * 2,
        category: geo.category,
        emoji: info.emoji || "🍽️",
        llm_reason: info.reason || null,
        updated_at: new Date().toISOString(),
      })
      await new Promise(r => setTimeout(r, 200))
    }

    // Step 4b: Fallback — Kakao popular restaurants if few results
    if (restaurants.length < 10) {
      console.log("Fallback: fetching from Kakao Local...")
      const hotAreas = ["홍대 맛집", "성수 맛집", "강남 맛집", "이태원 맛집", "망원 맛집",
        "을지로 맛집", "연남동 맛집", "합정 맛집", "신사 맛집", "잠실 맛집",
        "여의도 맛집", "건대 맛집", "명동 맛집", "압구정 맛집", "서촌 맛집"]

      for (const query of hotAreas) {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&sort=accuracy&size=3`
        const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
        const data = await res.json()
        for (const doc of (data?.documents ?? [])) {
          const lat = parseFloat(doc.y), lng = parseFloat(doc.x)
          if (lat < 37.42 || lat > 37.70 || lng < 126.76 || lng > 127.18) continue
          if (restaurants.some(r => r.name === doc.place_name)) continue
          const google = await getGoogleRating(doc.place_name, lat, lng).catch(() => null)
          const cat = doc.category_name?.split(" > ").pop() ?? ""
          restaurants.push({
            name: doc.place_name, address: doc.road_address_name || doc.address_name || "",
            lat, lng,
            google_rating: google?.rating ?? null, google_review_count: google?.reviewCount ?? 0,
            google_place_id: google?.placeId ?? null,
            instagram_mentions: 0, threads_mentions: 0, source_urls: [],
            trending_score: google?.reviewCount && google.reviewCount > 500 ? 3 : 1,
            category: cat, emoji: categoryToEmoji(cat), llm_reason: null,
            updated_at: new Date().toISOString(),
          })
          await new Promise(r => setTimeout(r, 150))
        }
      }
    }

    console.log(`Total restaurants: ${restaurants.length}`)

    // Step 5: Save to Supabase
    if (restaurants.length > 0) {
      await supabase.from("hot_restaurants").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      const { error } = await supabase.from("hot_restaurants").insert(restaurants)
      if (error) console.error("Insert error:", error)
    }

    return new Response(JSON.stringify({
      success: true,
      stats: { instagramPosts: instaRaw.length, threadsPosts: threadsRaw.length, llmExtracted: llmResults.length, saved: restaurants.length },
      restaurants: restaurants.map(r => ({ name: r.name, emoji: r.emoji, score: r.trending_score, rating: r.google_rating, reason: r.llm_reason })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("Scrape error:", err)
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})

// ── Fallback emoji mapping (when LLM is not available) ───
function categoryToEmoji(category: string): string {
  const map: Record<string, string> = {
    "한식": "🍲", "일식": "🍣", "중식": "🥟", "양식": "🍝", "이탈리안": "🍕",
    "카페": "☕", "디저트": "🍰", "베이커리": "🥐", "치킨": "🍗", "피자": "🍕",
    "버거": "🍔", "분식": "🥘", "국밥": "🍲", "곱창": "🥩", "삼겹살": "🥓",
    "라멘": "🍜", "스시": "🍣", "우동": "🍜", "브런치": "🥞", "스테이크": "🥩",
    "술집": "🍺", "와인바": "🍷", "칵테일바": "🍸", "샐러드": "🥗", "태국식": "🍛",
    "멕시칸": "🌮", "베트남식": "🍜", "인도식": "🍛",
  }
  for (const [key, emoji] of Object.entries(map)) {
    if (category.includes(key)) return emoji
  }
  return "🍽️"
}
