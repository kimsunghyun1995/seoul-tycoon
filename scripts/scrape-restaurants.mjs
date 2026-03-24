/**
 * Seoul Tycoon — Trending Restaurant Scraper (Threads only)
 * Run: node scripts/scrape-restaurants.mjs
 * Requires env vars: APIFY_API_TOKEN, KAKAO_REST_API_KEY
 * Optional: GOOGLE_PLACES_API_KEY, AAC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? ''
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY ?? ''
const AAC_API_KEY = process.env.AAC_API_KEY ?? ''
const AAC_API_BASE = process.env.AAC_API_BASE ?? 'https://aac-api.navercorp.com/'
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!APIFY_TOKEN || !KAKAO_KEY) {
  console.error('Required: APIFY_API_TOKEN, KAKAO_REST_API_KEY')
  process.exit(1)
}

// ── Threads search queries ───────────────────────────────
const THREADS_QUERIES = [
  // By area (most specific → best results)
  '홍대 맛집', '성수 맛집', '강남 맛집', '이태원 맛집', '망원 맛집',
  '을지로 맛집', '연남동 맛집', '합정 맛집', '압구정 맛집', '잠실 맛집',
  '여의도 맛집', '명동 맛집', '신사 맛집', '서촌 맛집', '익선동 맛집',
  // By subway station
  '건대입구 맛집', '왕십리 맛집', '삼성역 맛집', '교대 맛집', '신림 맛집',
  '홍대입구역 맛집', '신촌 맛집', '이대 맛집', '역삼 맛집', '사당 맛집',
]

// ── Verified food influencers on Threads ─────────────────
// (verified: food_keyword >= 2 in their posts)
const FOOD_INFLUENCERS = [
  'y_not_eat',             // 786 likes, 맛집 전문 (또간집, 솔직후기)
  'dasupbubu',             // 신상 맛집 추천, 위치+영업시간 포함
  'noodlefighter87',       // 웨이팅 맛집 리뷰
  'little_cherry_2026',    // 서울 빵집/맛집 발견
  'bk.pain_clinic',        // 동네 맛집 추천 (쌀국수 등)
  'haeonstylecom',         // 서울 야경 맛집
  'momentdemoment',        // 지역별 맛집 (창동 등)
  'ssoso.inn',             // 외식 리뷰
]

// ── Apify helper ─────────────────────────────────────────
async function runApifyActor(actorId, input) {
  console.log(`  Starting ${actorId}...`)
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const data = await res.json()
  const runId = data?.data?.id
  if (!runId) { console.error('  Failed:', data?.error?.message ?? 'unknown'); return [] }

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

// ── Scrape Threads keyword search ────────────────────────
async function scrapeThreadsKeyword(query, maxResults = 25) {
  return await runApifyActor('igview-owner~threads-search-scraper', {
    searchQuery: query, maxResults,
  })
}

// ── Scrape influencer profiles ───────────────────────────
async function scrapeInfluencerPosts() {
  const results = []
  // Use profile scraper for known food influencers
  for (const username of FOOD_INFLUENCERS.slice(0, 5)) { // Top 5 to save credits
    console.log(`  📱 @${username}...`)
    const posts = await runApifyActor('apify~threads-profile-api-scraper', {
      usernames: [username], maxPosts: 10,
    }).catch(() => [])

    for (const p of posts) {
      const text = p?.captionText ?? p?.text ?? ''
      if (text.includes('맛집') || text.includes('맛있') || text.includes('추천') || text.includes('식당')) {
        results.push({
          text,
          url: p?.postUrl ?? `https://threads.net/@${username}`,
          username,
          likes: parseInt(p?.likeCount ?? 0),
          reposts: parseInt(p?.repostCount ?? 0),
        })
      }
    }
  }
  return results
}

// ── Simple restaurant name extraction (no LLM fallback) ──
function extractNames(text) {
  const candidates = []
  // [식당명] or 【식당명】
  const brackets = text.match(/[【\[][^【\[\]】]{2,20}[】\]]/g)
  if (brackets) candidates.push(...brackets.map(m => m.replace(/[【】\[\]]/g, '').trim()))
  // "OO식당", "OO카페" etc
  const patterns = text.match(/[가-힣A-Za-z0-9]{2,15}(?:식당|카페|집|정|당|숍|키친|레스토랑|버거|피자|스시|라멘|국밥|곱창|치킨|냉면|설렁탕|순대|떡볶이|빵집|베이커리)/g)
  if (patterns) candidates.push(...patterns)
  // 📍 location marker pattern
  const locMatch = text.match(/📍\s*([가-힣A-Za-z0-9\s]{2,25})/g)
  if (locMatch) candidates.push(...locMatch.map(m => m.replace('📍', '').trim()))
  return [...new Set(candidates)].filter(n => n.length >= 2).slice(0, 3)
}

// ── LLM extraction ───────────────────────────────────────
async function llmExtract(posts) {
  if (!AAC_API_KEY || posts.length === 0) return []
  const results = []
  for (let i = 0; i < posts.length; i += 15) {
    const batch = posts.slice(i, i + 15)
    const postsText = batch.map((p, idx) => `[${idx + 1}] ${p.text.slice(0, 250)}`).join('\n\n')
    const prompt = `다음 Threads 게시글에서 서울 식당/카페 이름을 추출하세요.
광고/협찬은 제외. 음식 이모지와 한줄 이유도 작성.
JSON 배열로만 응답 (다른 텍스트 없이):
[{"postIndex":1,"name":"식당명","isAd":false,"emoji":"🍜","reason":"한줄 이유"}]

${postsText}`
    try {
      const res = await fetch(`${AAC_API_BASE}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AAC_API_KEY}` },
        body: JSON.stringify({ model: 'Qwen3-32B', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2000 }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        for (const item of JSON.parse(jsonMatch[0])) {
          if (!item.name || item.isAd) continue
          const post = batch[(item.postIndex ?? 1) - 1]
          results.push({ name: item.name, emoji: item.emoji ?? '🍽️', reason: item.reason ?? '', sourceUrl: post?.url ?? '' })
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
  if (!GOOGLE_API_KEY) return null
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,rating,user_ratings_total&key=${GOOGLE_API_KEY}`
  const place = (await (await fetch(url)).json())?.candidates?.[0]
  if (!place) return null
  return { rating: place.rating ?? 0, reviewCount: place.user_ratings_total ?? 0, placeId: place.place_id ?? '' }
}

const FOOD_EMOJI = { '한식': '🍲', '일식': '🍣', '중식': '🥟', '양식': '🍝', '이탈리안': '🍕', '카페': '☕', '디저트': '🍰', '치킨': '🍗', '피자': '🍕', '버거': '🍔', '분식': '🥘', '국밥': '🍲', '곱창': '🥩', '삼겹살': '🥓', '라멘': '🍜', '술집': '🍺', '스테이크': '🥩', '브런치': '🥞', '빵': '🥐', '냉면': '🍜', '설렁탕': '🍲' }

// ── MAIN ─────────────────────────────────────────────────
console.log('🔥 Seoul Tycoon Restaurant Scraper (Threads)\n')

// Step 1: Scrape Threads keyword searches (batch by 3 to avoid rate limits)
console.log('💬 Scraping Threads keyword searches...')
const allThreadsPosts = []

for (let i = 0; i < THREADS_QUERIES.length; i += 3) {
  const batch = THREADS_QUERIES.slice(i, i + 3)
  const results = await Promise.all(
    batch.map(q => scrapeThreadsKeyword(q, 20).catch(() => []))
  )
  for (const posts of results) {
    for (const p of posts) {
      allThreadsPosts.push({
        text: p?.captionText ?? '',
        url: p?.postUrl ?? '',
        username: p?.username ?? '',
        likes: parseInt(p?.likeCount ?? 0),
        isPaid: p?.isPaidPartnership === 'True',
      })
    }
  }
  if (i + 3 < THREADS_QUERIES.length) {
    console.log(`  ⏳ ${allThreadsPosts.length} posts so far, waiting...`)
    await new Promise(r => setTimeout(r, 3000))
  }
}

// Step 2: Scrape influencer profiles
console.log('\n📱 Scraping influencer profiles...')
const influencerPosts = await scrapeInfluencerPosts()
for (const p of influencerPosts) {
  allThreadsPosts.push({ text: p.text, url: p.url, username: p.username, likes: p.likes, isPaid: false })
}

// Deduplicate by URL
const seen = new Set()
const uniquePosts = allThreadsPosts.filter(p => {
  if (!p.text || p.text.length < 10 || p.isPaid) return false
  if (p.url && seen.has(p.url)) return false
  if (p.url) seen.add(p.url)
  return true
})

console.log(`\n📊 Total: ${allThreadsPosts.length} → Unique: ${uniquePosts.length} posts`)

// Step 3: Extract restaurant names
console.log('\n🔍 Extracting restaurant names...')
const mentionMap = new Map() // name → { count, sources, likes }

// Try LLM first
const llmResults = await llmExtract(uniquePosts)
console.log(`  LLM: ${llmResults.length} restaurants`)

for (const r of llmResults) {
  const e = mentionMap.get(r.name) ?? { count: 0, sources: [], emoji: r.emoji, reason: r.reason }
  e.count++
  if (r.sourceUrl) e.sources.push(r.sourceUrl)
  mentionMap.set(r.name, e)
}

// Also do heuristic extraction
for (const post of uniquePosts) {
  const names = extractNames(post.text)
  for (const name of names) {
    const e = mentionMap.get(name) ?? { count: 0, sources: [], emoji: '🍽️', reason: '' }
    e.count++
    if (post.url) e.sources.push(post.url)
    mentionMap.set(name, e)
  }
}

console.log(`  Total unique candidates: ${mentionMap.size}`)

// Step 4: Geocode + Google rating
console.log('\n📍 Geocoding + ratings...')
const restaurants = []
const sorted = [...mentionMap.entries()]
  .filter(([name]) => name.length >= 2 && !/^[0-9@#]/.test(name))
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 40)

for (const [name, info] of sorted) {
  const geo = await geocode(name)
  if (!geo || geo.lat < 37.42 || geo.lat > 37.70 || geo.lng < 126.76 || geo.lng > 127.18) continue
  const g = await googleRating(geo.name, geo.lat, geo.lng).catch(() => null)
  const cat = geo.category
  restaurants.push({
    name: geo.name, address: geo.address, lat: geo.lat, lng: geo.lng,
    google_rating: g?.rating ?? null, google_review_count: g?.reviewCount ?? 0,
    google_place_id: g?.placeId ?? null,
    instagram_mentions: 0, threads_mentions: info.count,
    source_urls: [...new Set(info.sources)].slice(0, 5),
    trending_score: info.count * 3,
    category: cat,
    emoji: info.emoji !== '🍽️' ? info.emoji : (Object.entries(FOOD_EMOJI).find(([k]) => cat.includes(k))?.[1] || '🍽️'),
    llm_reason: info.reason || null,
    updated_at: new Date().toISOString(),
  })
  process.stdout.write(`  ${geo.name} ⭐${g?.rating ?? '?'}\n`)
  await new Promise(r => setTimeout(r, 200))
}

// Step 4b: Kakao fallback
if (restaurants.length < 15) {
  console.log('\n🔄 Kakao fallback...')
  const areas = ['홍대 맛집', '성수 맛집', '강남 맛집', '이태원 맛집', '망원 맛집', '을지로 맛집', '연남동 맛집', '합정 맛집', '잠실 맛집', '여의도 맛집', '명동 맛집', '압구정 맛집', '신사 맛집', '익선동 맛집', '서촌 맛집']
  for (const q of areas) {
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

// Step 5: Save
if (restaurants.length > 0 && SUPABASE_KEY) {
  console.log('\n💾 Saving to Supabase...')
  await fetch(`${SUPABASE_URL}/rest/v1/hot_restaurants?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hot_restaurants`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(restaurants),
  })
  console.log(`  Status: ${res.status} ${res.statusText}`)
} else if (!SUPABASE_KEY) {
  console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not set.')
}

console.log('\n✅ Done!')
restaurants.forEach((r, i) => console.log(`  ${i + 1}. ${r.emoji} ${r.name} ⭐${r.google_rating ?? '?'} (TH:${r.threads_mentions})`))
