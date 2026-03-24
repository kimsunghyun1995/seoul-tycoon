/**
 * Local script to scrape trending restaurants and save to Supabase.
 * Run: node scripts/scrape-restaurants.mjs
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? ''
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY ?? ''
const AAC_API_KEY = process.env.AAC_API_KEY ?? ''
const AAC_API_BASE = process.env.AAC_API_BASE ?? 'https://aac-api.navercorp.com/'
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!APIFY_TOKEN || !KAKAO_KEY) {
  console.error('Required env vars: APIFY_API_TOKEN, KAKAO_REST_API_KEY')
  console.error('Optional: GOOGLE_PLACES_API_KEY, AAC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── Apify helper ─────────────────────────────────────────
async function runApifyActor(actorId, input) {
  console.log(`  Starting ${actorId}...`)
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const data = await res.json()
  const runId = data?.data?.id
  if (!runId) { console.error('  Failed to start:', data); return [] }

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const status = (await s.json())?.data?.status
    process.stdout.write('.')
    if (status === 'SUCCEEDED') { console.log(' done'); break }
    if (status === 'FAILED' || status === 'ABORTED') { console.log(' failed'); return [] }
  }

  const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=200`)
  return await items.json()
}

// ── LLM ──────────────────────────────────────────────────
async function llmExtract(posts) {
  if (!AAC_API_KEY || posts.length === 0) return []
  const results = []

  for (let i = 0; i < posts.length; i += 15) {
    const batch = posts.slice(i, i + 15)
    const postsText = batch.map((p, idx) => `[${idx + 1}] (${p.source}) ${p.text.slice(0, 250)}`).join('\n\n')

    const prompt = `다음은 서울 맛집 관련 SNS 게시글들입니다. 각 게시글에서:
1. 실제 식당 이름을 추출하세요 (없으면 skip)
2. 광고/협찬인지 판단하세요
3. 해당 음식에 맞는 이모지 1개 (🍜🍣🍕🍔🍲🥘🍖🥩🍝🍛🥟🍱🍰☕🍺🥗🌮🍗 등)
4. 한줄 추천 이유

JSON 배열로만 응답. /no_think 태그나 다른 텍스트 없이:
[{"postIndex": 1, "restaurantName": "식당명", "isAd": false, "emoji": "🍜", "reason": "추천 이유"}]

게시글:\n${postsText}`

    try {
      const res = await fetch(`${AAC_API_BASE}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AAC_API_KEY}` },
        body: JSON.stringify({ model: 'Qwen3-32B', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2000 }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        for (const item of JSON.parse(jsonMatch[0])) {
          if (!item.restaurantName || item.isAd) continue
          const post = batch[(item.postIndex ?? 1) - 1]
          results.push({
            name: item.restaurantName, emoji: item.emoji ?? '🍽️',
            reason: item.reason ?? '', source: post?.source ?? '', sourceUrl: post?.url ?? '',
          })
        }
      }
    } catch (e) { console.error('  LLM error:', e.message) }
    await new Promise(r => setTimeout(r, 1000))
  }
  return results
}

// ── Kakao Geocode ────────────────────────────────────────
async function geocode(name) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name + ' 서울')}&category_group_code=FD6&size=1`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
  const doc = (await res.json())?.documents?.[0]
  if (!doc) return null
  return { name: doc.place_name, address: doc.road_address_name || doc.address_name || '', lat: parseFloat(doc.y), lng: parseFloat(doc.x), category: doc.category_name?.split(' > ').pop() ?? '' }
}

// ── Google Rating ────────────────────────────────────────
async function googleRating(name, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,rating,user_ratings_total&key=${GOOGLE_API_KEY}`
  const place = (await (await fetch(url)).json())?.candidates?.[0]
  if (!place) return null
  return { rating: place.rating ?? 0, reviewCount: place.user_ratings_total ?? 0, placeId: place.place_id ?? '' }
}

const FOOD_EMOJI = { '한식': '🍲', '일식': '🍣', '중식': '🥟', '양식': '🍝', '이탈리안': '🍕', '카페': '☕', '디저트': '🍰', '치킨': '🍗', '피자': '🍕', '버거': '🍔', '분식': '🥘', '국밥': '🍲', '곱창': '🥩', '삼겹살': '🥓', '라멘': '🍜', '술집': '🍺', '스테이크': '🥩', '브런치': '🥞' }

// ── Main ─────────────────────────────────────────────────
console.log('🔥 Seoul Tycoon Restaurant Scraper\n')

// 1. Scrape
console.log('📸 Scraping Instagram...')
const instaRaw = await runApifyActor('apify~instagram-hashtag-scraper', {
  hashtags: ['서울맛집', '핫플', '서울핫플', '줄서는맛집'], resultsLimit: 40, searchType: 'hashtag',
}).catch(() => [])

console.log('💬 Scraping Threads...')
const threadsRaw = await runApifyActor('igview-owner~threads-search-scraper', {
  searchQuery: '서울 맛집', maxResults: 30,
}).catch(() => [])

console.log(`\n📊 Instagram: ${instaRaw.length}, Threads: ${threadsRaw.length}`)

// 2. Normalize posts
const allPosts = [
  ...instaRaw.filter(p => !p?.isPaidPartnership).map(p => ({
    text: p?.caption ?? p?.text ?? '', url: p?.url ?? '', source: 'instagram',
  })),
  ...threadsRaw.filter(p => p?.isPaidPartnership !== 'True').map(p => ({
    text: p?.captionText ?? p?.text ?? '', url: p?.postUrl ?? '', source: 'threads',
  })),
].filter(p => p.text.length > 10)

console.log(`📝 Posts after filtering: ${allPosts.length}`)

// 3. LLM extract
console.log('\n🤖 LLM extracting restaurants...')
const llmResults = await llmExtract(allPosts)
console.log(`✅ LLM found: ${llmResults.length} restaurants`)

// 4. Aggregate
const restMap = new Map()
for (const r of llmResults) {
  const e = restMap.get(r.name) ?? { emoji: r.emoji, reason: r.reason, instagram: 0, threads: 0, sources: [] }
  if (r.source === 'instagram') e.instagram++; else e.threads++
  if (r.sourceUrl) e.sources.push(r.sourceUrl)
  restMap.set(r.name, e)
}

// 5. Geocode + Google
console.log('\n📍 Geocoding + Google ratings...')
const restaurants = []
const sorted = [...restMap.entries()].sort((a, b) => (b[1].instagram + b[1].threads) - (a[1].instagram + a[1].threads)).slice(0, 30)

for (const [name, info] of sorted) {
  const geo = await geocode(name)
  if (!geo || geo.lat < 37.42 || geo.lat > 37.70 || geo.lng < 126.76 || geo.lng > 127.18) continue
  const g = await googleRating(geo.name, geo.lat, geo.lng).catch(() => null)
  restaurants.push({
    name: geo.name, address: geo.address, lat: geo.lat, lng: geo.lng,
    google_rating: g?.rating ?? null, google_review_count: g?.reviewCount ?? 0, google_place_id: g?.placeId ?? null,
    instagram_mentions: info.instagram, threads_mentions: info.threads,
    source_urls: info.sources.slice(0, 5), trending_score: info.instagram * 2 + info.threads * 2,
    category: geo.category, emoji: info.emoji || Object.entries(FOOD_EMOJI).find(([k]) => geo.category.includes(k))?.[1] || '🍽️',
    llm_reason: info.reason || null, updated_at: new Date().toISOString(),
  })
  process.stdout.write(`  ${geo.name} ⭐${g?.rating ?? '?'}\n`)
  await new Promise(r => setTimeout(r, 200))
}

// 5b. Fallback
if (restaurants.length < 10) {
  console.log('\n🔄 Kakao fallback...')
  for (const q of ['홍대 맛집', '성수 맛집', '강남 맛집', '이태원 맛집', '망원 맛집', '을지로 맛집', '연남동 맛집', '합정 맛집', '잠실 맛집', '여의도 맛집', '명동 맛집', '압구정 맛집']) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&category_group_code=FD6&sort=accuracy&size=3`
    const docs = (await (await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })).json())?.documents ?? []
    for (const d of docs) {
      const lat = parseFloat(d.y), lng = parseFloat(d.x)
      if (lat < 37.42 || lat > 37.70 || lng < 126.76 || lng > 127.18) continue
      if (restaurants.some(r => r.name === d.place_name)) continue
      const g = await googleRating(d.place_name, lat, lng).catch(() => null)
      const cat = d.category_name?.split(' > ').pop() ?? ''
      restaurants.push({
        name: d.place_name, address: d.road_address_name || '', lat, lng,
        google_rating: g?.rating ?? null, google_review_count: g?.reviewCount ?? 0, google_place_id: g?.placeId ?? null,
        instagram_mentions: 0, threads_mentions: 0, source_urls: [], trending_score: 1,
        category: cat, emoji: Object.entries(FOOD_EMOJI).find(([k]) => cat.includes(k))?.[1] || '🍽️',
        llm_reason: null, updated_at: new Date().toISOString(),
      })
      await new Promise(r => setTimeout(r, 150))
    }
  }
}

console.log(`\n🔥 Total: ${restaurants.length} restaurants`)

// 6. Save to Supabase via REST API
if (restaurants.length > 0 && SUPABASE_KEY) {
  console.log('\n💾 Saving to Supabase...')
  // Delete old
  await fetch(`${SUPABASE_URL}/rest/v1/hot_restaurants?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  // Insert new
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hot_restaurants`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(restaurants),
  })
  console.log(`  Status: ${res.status} ${res.statusText}`)
} else if (!SUPABASE_KEY) {
  console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Results not saved.')
  console.log('  Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key')
}

console.log('\n✅ Done!')
restaurants.forEach((r, i) => console.log(`  ${i + 1}. ${r.emoji} ${r.name} ⭐${r.google_rating ?? '?'} (IG:${r.instagram_mentions} TH:${r.threads_mentions})`))
