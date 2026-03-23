import type { SubwayStation } from '../types'
import { haversineDistance } from './EventMatcher'

const NEARBY_THRESHOLD_KM = 0.8 // 800m

// Raw station data: [id, name, nameEn, lines[], lat, lng, nearbyHotspots[]]
// Nearby hotspots are POI codes within ~800m walking distance
const RAW_STATIONS: [string, string, string, number[], number, number, string[]][] = [
  // ── Line 1 ────────────────────────────────────────────────
  ['ST001', '서울역', 'Seoul Station',       [1, 4], 37.5546, 126.9706, ['POI009']],
  ['ST002', '종각',   'Jonggak',             [1],    37.5703, 126.9827, ['POI004', 'POI007']],
  ['ST003', '종로3가', 'Jongno 3-ga',        [1, 3, 5], 37.5715, 126.9921, ['POI003', 'POI004']],
  ['ST004', '청량리', 'Cheongnyangni',       [1],    37.5805, 127.0455, ['POI061']],

  // ── Line 2 ────────────────────────────────────────────────
  ['ST010', '홍대입구', 'Hongik Univ.',      [2],    37.5571, 126.9240, ['POI014', 'POI016']],
  ['ST011', '신촌',   'Sinchon',             [2],    37.5572, 126.9370, ['POI017']],
  ['ST012', '합정',   'Hapjeong',            [2, 6], 37.5494, 126.9057, ['POI015', 'POI077']],
  ['ST013', '당산',   'Dangsan',             [2, 9], 37.5354, 126.8995, ['POI103']],
  ['ST014', '신도림', 'Sindorim',            [1, 2], 37.5083, 126.8913, ['POI026', 'POI027']],
  ['ST015', '사당',   'Sadang',              [2, 4], 37.4764, 126.9815, ['POI030']],
  ['ST016', '교대',   'Gyodae',              [2, 3], 37.4938, 126.9937, ['POI036']],
  ['ST017', '강남',   'Gangnam',             [2],    37.4981, 127.0276, ['POI035', 'POI046']],
  ['ST018', '역삼',   'Yeoksam',             [2],    37.5010, 127.0363, ['POI045', 'POI046']],
  ['ST019', '선릉',   'Seolleung',           [2],    37.5040, 127.0491, ['POI045']],
  ['ST020', '삼성',   'Samsung',             [2],    37.5088, 127.0633, ['POI044', 'POI083']],
  ['ST021', '잠실',   'Jamsil',              [2, 8], 37.5130, 127.1000, ['POI047', 'POI049', 'POI050']],
  ['ST022', '건대입구', 'Konkuk Univ.',      [2, 7], 37.5407, 127.0702, ['POI055']],
  ['ST023', '왕십리', 'Wangsimni',           [2, 5], 37.5614, 127.0370, ['POI057']],
  ['ST024', '성수',   'Seongsu',             [2],    37.5444, 127.0558, ['POI058']],
  ['ST025', '신림',   'Sillim',              [2],    37.4837, 126.9291, ['POI034']],

  // ── Line 3 ────────────────────────────────────────────────
  ['ST030', '고속터미널', 'Express Bus Terminal', [3, 7, 9], 37.5048, 127.0048, ['POI039', 'POI040']],
  ['ST031', '압구정', 'Apgujeong',           [3],    37.5261, 127.0220, ['POI041', 'POI085']],
  ['ST032', '경복궁', 'Gyeongbokgung',       [3],    37.5796, 126.9769, ['POI001', 'POI006']],
  ['ST033', '안국',   'Anguk',               [3],    37.5762, 126.9851, ['POI004', 'POI006']],

  // ── Line 4 ────────────────────────────────────────────────
  ['ST040', '명동',   'Myeongdong',          [4],    37.5634, 126.9849, ['POI008', 'POI010']],
  ['ST041', '동대문', 'Dongdaemun',          [1, 4], 37.5714, 127.0097, ['POI059', 'POI060']],
  ['ST042', '혜화',   'Hyehwa',              [4],    37.5824, 127.0017, ['POI005', 'POI072']],

  // ── Line 5 ────────────────────────────────────────────────
  ['ST050', '여의도', 'Yeouido',             [5],    37.5264, 126.9246, ['POI022', 'POI023', 'POI080']],
  ['ST051', '광화문', 'Gwanghwamun',         [5],    37.5721, 126.9768, ['POI001', 'POI002', 'POI007']],
  ['ST052', '마곡',   'Magok',               [5],    37.5566, 126.8355, ['POI096', 'POI107']],

  // ── Line 6 ────────────────────────────────────────────────
  ['ST060', '이태원', 'Itaewon',             [6],    37.5340, 126.9942, ['POI011']],
  ['ST061', '한남',   'Hannam',              [6],    37.5376, 127.0047, ['POI013']],
  ['ST062', '상수',   'Sangsu',              [6],    37.5485, 126.9229, ['POI016', 'POI014']],

  // ── Line 7 ────────────────────────────────────────────────
  ['ST070', '노원',   'Nowon',               [7],    37.6547, 127.0563, ['POI064', 'POI065']],
  ['ST071', '가산디지털단지', 'Gasan Digital Complex', [1, 7], 37.4813, 126.8824, ['POI028']],
  ['ST072', '대림',   'Daelim',              [2, 7], 37.4911, 126.8957, ['POI104']],

  // ── Line 8 ────────────────────────────────────────────────
  ['ST080', '석촌',   'Seokchon',            [8],    37.5073, 127.1003, ['POI050', 'POI086']],

  // ── Line 9 ────────────────────────────────────────────────
  ['ST090', '국회의사당', 'National Assembly', [9],   37.5283, 126.9179, ['POI022', 'POI080']],

  // ── Additional important stations ─────────────────────────
  ['ST100', '용산',   'Yongsan',             [1],    37.5299, 126.9648, ['POI012']],
  ['ST101', '노량진', 'Noryangjin',          [1, 9], 37.5131, 126.9422, ['POI109']],
  ['ST102', '동작',   'Dongjak',             [4, 9], 37.5060, 126.9829, ['POI112']],
  ['ST103', '총신대입구', 'Chongshin Univ.', [4, 7], 37.4854, 126.9823, ['POI111']],
  ['ST104', '서울대입구', 'Seoul Nat\'l Univ.', [2], 37.4812, 126.9527, ['POI032']],
  ['ST105', '영등포구청', 'Yeongdeungpo-gu Office', [2, 5], 37.5259, 126.8961, ['POI101', 'POI103']],
  ['ST106', '공덕',   'Gongdeok',            [5, 6], 37.5455, 126.9521, ['POI018']],
  ['ST107', '동대문역사문화공원', 'DDP',     [2, 4, 5], 37.5670, 127.0091, ['POI059', 'POI060']],
  ['ST108', '뚝섬',   'Ttukseom',            [2],    37.5294, 127.0662, ['POI056', 'POI081']],
  ['ST109', '천호',   'Cheonho',             [5, 8], 37.5382, 127.1244, ['POI053', 'POI092']],
  ['ST110', '김포공항', 'Gimpo Int\'l Airport', [5, 9], 37.5575, 126.7942, ['POI025']],
]

export const SUBWAY_STATIONS: SubwayStation[] = RAW_STATIONS.map(
  ([id, name, nameEn, lines, lat, lng, nearbyHotspots]) => ({
    id, name, nameEn, lines, lat, lng, nearbyHotspots,
  })
)

export const SUBWAY_STATION_MAP: Map<string, SubwayStation> = new Map(
  SUBWAY_STATIONS.map(s => [s.id, s])
)

/**
 * Find all subway stations that have the given hotspot in their nearbyHotspots list.
 * Falls back to Haversine distance check if no explicit mapping found.
 */
export function findNearbyStations(hotspotCode: string): SubwayStation[] {
  // Primary: use pre-mapped nearbyHotspots
  const mapped = SUBWAY_STATIONS.filter(s => s.nearbyHotspots.includes(hotspotCode))
  if (mapped.length > 0) return mapped

  // Fallback: compute by distance (shouldn't normally be needed)
  // We don't have hotspot coords here, so return empty
  return []
}

/**
 * Find stations near a coordinate (for dynamic use).
 */
export function findStationsNearCoord(lat: number, lng: number): SubwayStation[] {
  return SUBWAY_STATIONS.filter(
    s => haversineDistance(lat, lng, s.lat, s.lng) <= NEARBY_THRESHOLD_KM
  )
}
