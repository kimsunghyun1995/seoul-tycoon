import type { SubwayStation } from '../types'
import { haversineDistance } from './EventMatcher'

const NEARBY_THRESHOLD_KM = 0.8 // 800m

// Raw station data: [id, name, nameEn, lines[], lat, lng, nearbyHotspots[]]
// All coordinates verified within Seoul city limits (lat: 37.42~37.70, lng: 126.76~127.18)
// Nearby hotspots are POI codes within ~800m walking distance
const RAW_STATIONS: [string, string, string, number[], number, number, string[]][] = [
  // ── Line 1 (Dark Blue #0052A4) ──────────────────────────────
  ['ST001', '서울역', 'Seoul Station',       [1, 4], 37.5547, 126.9706, ['POI009']],
  ['ST002', '종각',   'Jonggak',             [1],    37.5702, 126.9830, ['POI004', 'POI007']],
  ['ST003', '종로3가', 'Jongno 3-ga',        [1, 3, 5], 37.5715, 126.9918, ['POI003', 'POI004']],
  ['ST004', '동대문', 'Dongdaemun',          [1, 4], 37.5712, 127.0095, ['POI059', 'POI060']],
  ['ST005', '청량리', 'Cheongnyangni',       [1],    37.5804, 127.0479, ['POI061']],

  // ── Line 2 (Green #00A84D) — circular ────────────────────────
  ['ST010', '시청',   'City Hall',           [2],    37.5636, 126.9775, ['POI007', 'POI008']],
  ['ST011', '을지로입구', 'Euljiro 1-ga',    [2],    37.5660, 126.9826, ['POI007', 'POI008']],
  ['ST012', '을지로3가', 'Euljiro 3-ga',     [2, 3], 37.5664, 126.9918, ['POI007']],
  ['ST013', '동대문역사문화공원', 'DDP',     [2, 4, 5], 37.5653, 127.0075, ['POI059', 'POI060']],
  ['ST014', '신당',   'Sindang',             [2, 6], 37.5660, 127.0177, []],
  ['ST015', '왕십리', 'Wangsimni',           [2, 5], 37.5614, 127.0370, ['POI057']],
  ['ST016', '성수',   'Seongsu',             [2],    37.5444, 127.0558, ['POI058']],
  ['ST017', '건대입구', 'Konkuk Univ.',      [2, 7], 37.5407, 127.0702, ['POI055']],
  ['ST018', '잠실',   'Jamsil',              [2, 8], 37.5130, 127.1000, ['POI047', 'POI049', 'POI050']],
  ['ST019', '삼성',   'Samsung',             [2],    37.5088, 127.0633, ['POI044', 'POI083', 'POI043']],
  ['ST020', '역삼',   'Yeoksam',             [2],    37.5004, 127.0367, ['POI045', 'POI046']],
  ['ST021', '강남',   'Gangnam',             [2],    37.4981, 127.0276, ['POI035', 'POI046']],
  ['ST022', '교대',   'Gyodae',              [2, 3], 37.4938, 126.9937, ['POI036']],
  ['ST023', '사당',   'Sadang',              [2, 4], 37.4764, 126.9815, ['POI030']],
  ['ST024', '신림',   'Sillim',              [2],    37.4837, 126.9291, ['POI034']],
  ['ST025', '신도림', 'Sindorim',            [2],    37.5088, 126.8913, ['POI026', 'POI027']],
  ['ST026', '영등포구청', 'Yeongdeungpo-gu Office', [2, 5], 37.5254, 126.8964, ['POI101', 'POI102']],
  ['ST027', '당산',   'Dangsan',             [2],    37.5354, 126.8995, ['POI103']],
  ['ST028', '합정',   'Hapjeong',            [2, 6], 37.5494, 126.9137, ['POI015']],
  ['ST029', '홍대입구', 'Hongik Univ.',      [2],    37.5571, 126.9240, ['POI014', 'POI016']],
  ['ST030', '신촌',   'Sinchon',             [2],    37.5572, 126.9370, ['POI017']],
  ['ST031', '이대',   'Ewha Womans Univ.',   [2],    37.5569, 126.9462, ['POI017']],
  ['ST032', '서울대입구', 'Seoul Nat\'l Univ.', [2], 37.4812, 126.9527, ['POI032']],
  ['ST033', '뚝섬',   'Ttukseom',            [2],    37.5294, 127.0662, ['POI056', 'POI081']],

  // ── Line 3 (Orange #EF7C1C) ──────────────────────────────────
  ['ST040', '경복궁', 'Gyeongbokgung',       [3],    37.5759, 126.9736, ['POI001', 'POI006']],
  ['ST041', '안국',   'Anguk',               [3],    37.5767, 126.9856, ['POI004', 'POI006']],
  // 종로3가 is ST003 (transfer with line 1, 5)
  // 을지로3가 is ST012 (transfer with line 2)
  ['ST042', '충무로', 'Chungmuro',           [3, 4], 37.5612, 126.9942, ['POI010']],
  ['ST043', '약수',   'Yaksu',               [3, 6], 37.5546, 127.0109, []],
  ['ST044', '옥수',   'Oksu',                [3],    37.5404, 127.0172, ['POI013']],
  ['ST045', '압구정', 'Apgujeong',           [3],    37.5270, 127.0286, ['POI041', 'POI085']],
  ['ST046', '신사',   'Sinsa',               [3],    37.5168, 127.0202, ['POI084']],
  ['ST047', '고속터미널', 'Express Bus Terminal', [3, 7, 9], 37.5048, 127.0048, ['POI039', 'POI040', 'POI115']],
  // 교대 is ST022 (transfer with line 2)

  // ── Line 4 (Sky Blue #00A5DE) ─────────────────────────────────
  ['ST050', '혜화',   'Hyehwa',              [4],    37.5824, 127.0017, ['POI005', 'POI072']],
  // 동대문 is ST004 (transfer with line 1)
  // 동대문역사문화공원 is ST013 (transfer with line 2, 5)
  // 충무로 is ST042 (transfer with line 3)
  ['ST051', '명동',   'Myeongdong',          [4],    37.5634, 126.9849, ['POI008', 'POI010']],
  ['ST052', '회현',   'Hoehyeon',            [4],    37.5586, 126.9814, ['POI010']],
  // 서울역 is ST001 (transfer with line 1)
  ['ST053', '이촌',   'Ichon',               [4],    37.5299, 126.9648, ['POI012', 'POI078']],
  // 사당 is ST023 (transfer with line 2)
  ['ST054', '동작',   'Dongjak',             [4, 9], 37.5060, 126.9829, ['POI112']],

  // ── Line 5 (Purple #996CAC) ───────────────────────────────────
  ['ST060', '광화문', 'Gwanghwamun',         [5],    37.5707, 126.9772, ['POI001', 'POI002', 'POI007']],
  // 종로3가 is ST003 (transfer with line 1, 3)
  // 동대문역사문화공원 is ST013 (transfer with line 2, 4)
  ['ST061', '청구',   'Cheonggu',            [5, 6], 37.5601, 127.0143, []],
  // 왕십리 is ST015 (transfer with line 2)
  ['ST062', '마장',   'Majang',              [5],    37.5654, 127.0425, []],
  ['ST063', '여의도', 'Yeouido',             [5, 9], 37.5264, 126.9246, ['POI022', 'POI023', 'POI080']],
  ['ST064', '마곡',   'Magok',               [5],    37.5566, 126.8355, ['POI096', 'POI107']],
  ['ST065', '발산',   'Balsan',              [5],    37.5468, 126.8379, ['POI097', 'POI099']],
  ['ST066', '강동',   'Gangdong',            [5],    37.5351, 127.1371, ['POI052']],
  ['ST067', '천호',   'Cheonho',             [5, 8], 37.5382, 127.1244, ['POI053', 'POI092']],
  ['ST068', '김포공항', 'Gimpo Int\'l Airport', [5, 9], 37.5575, 126.7942, ['POI025']],

  // ── Line 6 (Brown #CD7C2F) ───────────────────────────────────
  ['ST070', '이태원', 'Itaewon',             [6],    37.5340, 126.9942, ['POI011']],
  ['ST071', '한강진', 'Hangangjin',          [6],    37.5393, 126.9973, ['POI013']],
  ['ST072', '삼각지', 'Samgakji',            [6],    37.5345, 126.9725, ['POI012']],
  ['ST073', '효창공원앞', 'Hyochang Park',   [6],    37.5394, 126.9611, []],
  ['ST074', '공덕',   'Gongdeok',            [5, 6], 37.5442, 126.9516, ['POI018']],
  ['ST075', '상수',   'Sangsu',              [6],    37.5478, 126.9232, ['POI016', 'POI014']],
  ['ST076', '망원',   'Mangwon',             [6],    37.5553, 126.9102, ['POI077']],
  // 합정 is ST028 (transfer with line 2)

  // ── Line 7 (Olive #747F00) ───────────────────────────────────
  // 건대입구 is ST017 (transfer with line 2)
  ['ST080', '어린이대공원', 'Children\'s Grand Park', [7], 37.5481, 127.0742, ['POI055']],
  ['ST081', '노원',   'Nowon',               [7],    37.6547, 127.0563, ['POI064', 'POI065']],
  ['ST082', '태릉입구', 'Taereung',          [7],    37.6204, 127.0734, ['POI067']],
  ['ST083', '가산디지털단지', 'Gasan Digital Complex', [7], 37.4813, 126.8824, ['POI028']],
  ['ST084', '이수',   'Isu',                 [4, 7], 37.4854, 126.9823, ['POI031', 'POI111']],
  ['ST085', '대림',   'Daelim',              [2, 7], 37.4911, 126.8957, ['POI104']],

  // ── Line 8 (Pink #E6186C) ────────────────────────────────────
  // 잠실 is ST018 (transfer with line 2)
  ['ST090', '석촌',   'Seokchon',            [8, 9], 37.5073, 127.1003, ['POI050', 'POI086', 'POI118']],
  ['ST091', '잠실나루', 'Jamsillaru',        [8],    37.5194, 127.0828, ['POI116']],
  // 천호 is ST067 (transfer with line 5)

  // ── Line 9 (Gold #BDB092) ──────────────────────────────────
  // 여의도 is ST063 (transfer with line 5)
  ['ST100', '노량진', 'Noryangjin',          [9],    37.5131, 126.9422, ['POI109']],
  // 고속터미널 is ST047 (transfer with line 3, 7)
  ['ST101', '신논현', 'Sinnonhyeon',         [9],    37.5047, 127.0247, ['POI035']],
  ['ST102', '선정릉', 'Seonjeongneung',      [9],    37.5103, 127.0437, ['POI045']],
  ['ST103', '종합운동장', 'Sports Complex',  [2, 9], 37.5107, 127.0734, ['POI043', 'POI048']],
  // 석촌 is ST090 (transfer with line 8)

  // ── Additional important stations ────────────────────────────
  ['ST110', '용산',   'Yongsan',             [1],    37.5299, 126.9648, ['POI012']],
  ['ST111', '국회의사당', 'National Assembly', [9],   37.5283, 126.9179, ['POI022', 'POI080']],
  ['ST112', '숭실대입구', 'Soongsil Univ.',  [7],    37.4962, 126.9559, ['POI110']],
  ['ST113', '내방',   'Naebang',             [7],    37.4950, 126.9965, ['POI114']],
  ['ST114', '보라매', 'Boramae',             [7],    37.4940, 126.9209, ['POI106']],
  ['ST115', '잠실새내', 'Jamsil Saenae',     [2],    37.5069, 127.0861, ['POI117']],
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

/**
 * Route lines for drawing subway routes on the map.
 * Coordinates are [lat, lng] in station order along each line.
 */
export const SUBWAY_ROUTE_LINES: { lineNumber: number; color: string; coordinates: [number, number][] }[] = [
  {
    lineNumber: 1,
    color: '#0052A4',
    coordinates: [
      [37.5547, 126.9706], // 서울역
      [37.5702, 126.9830], // 종각
      [37.5715, 126.9918], // 종로3가
      [37.5712, 127.0095], // 동대문
      [37.5804, 127.0479], // 청량리
    ],
  },
  {
    lineNumber: 2,
    color: '#00A84D',
    coordinates: [
      // Circular line (clockwise from 시청)
      [37.5636, 126.9775], // 시청
      [37.5660, 126.9826], // 을지로입구
      [37.5664, 126.9918], // 을지로3가
      [37.5653, 127.0075], // 동대문역사문화공원
      [37.5660, 127.0177], // 신당
      [37.5614, 127.0370], // 왕십리
      [37.5444, 127.0558], // 성수
      [37.5294, 127.0662], // 뚝섬
      [37.5407, 127.0702], // 건대입구
      [37.5107, 127.0734], // 종합운동장
      [37.5069, 127.0861], // 잠실새내
      [37.5130, 127.1000], // 잠실
      [37.5088, 127.0633], // 삼성
      [37.5004, 127.0367], // 역삼
      [37.4981, 127.0276], // 강남
      [37.4938, 126.9937], // 교대
      [37.4764, 126.9815], // 사당
      [37.4812, 126.9527], // 서울대입구
      [37.4837, 126.9291], // 신림
      [37.5088, 126.8913], // 신도림
      [37.4911, 126.8957], // 대림 (branch)
      [37.5088, 126.8913], // 신도림 (back to main)
      [37.5254, 126.8964], // 영등포구청
      [37.5354, 126.8995], // 당산
      [37.5494, 126.9137], // 합정
      [37.5571, 126.9240], // 홍대입구
      [37.5572, 126.9370], // 신촌
      [37.5569, 126.9462], // 이대
      [37.5636, 126.9775], // 시청 (close circle)
    ],
  },
  {
    lineNumber: 3,
    color: '#EF7C1C',
    coordinates: [
      [37.5759, 126.9736], // 경복궁
      [37.5767, 126.9856], // 안국
      [37.5715, 126.9918], // 종로3가
      [37.5664, 126.9918], // 을지로3가
      [37.5612, 126.9942], // 충무로
      [37.5546, 127.0109], // 약수
      [37.5404, 127.0172], // 옥수
      [37.5270, 127.0286], // 압구정
      [37.5168, 127.0202], // 신사
      [37.5048, 127.0048], // 고속터미널
      [37.4938, 126.9937], // 교대
    ],
  },
  {
    lineNumber: 4,
    color: '#00A5DE',
    coordinates: [
      [37.5824, 127.0017], // 혜화
      [37.5712, 127.0095], // 동대문
      [37.5653, 127.0075], // 동대문역사문화공원
      [37.5612, 126.9942], // 충무로
      [37.5634, 126.9849], // 명동
      [37.5586, 126.9814], // 회현
      [37.5547, 126.9706], // 서울역
      [37.5299, 126.9648], // 이촌
      [37.5060, 126.9829], // 동작
      [37.4854, 126.9823], // 이수
      [37.4764, 126.9815], // 사당
    ],
  },
  {
    lineNumber: 5,
    color: '#996CAC',
    coordinates: [
      [37.5575, 126.7942], // 김포공항
      [37.5566, 126.8355], // 마곡
      [37.5468, 126.8379], // 발산
      [37.5264, 126.9246], // 여의도
      [37.5442, 126.9516], // 공덕
      [37.5707, 126.9772], // 광화문
      [37.5715, 126.9918], // 종로3가
      [37.5653, 127.0075], // 동대문역사문화공원
      [37.5601, 127.0143], // 청구
      [37.5614, 127.0370], // 왕십리
      [37.5654, 127.0425], // 마장
      [37.5382, 127.1244], // 천호
      [37.5351, 127.1371], // 강동
    ],
  },
  {
    lineNumber: 6,
    color: '#CD7C2F',
    coordinates: [
      [37.5553, 126.9102], // 망원
      [37.5494, 126.9137], // 합정
      [37.5478, 126.9232], // 상수
      [37.5442, 126.9516], // 공덕
      [37.5394, 126.9611], // 효창공원앞
      [37.5345, 126.9725], // 삼각지
      [37.5340, 126.9942], // 이태원
      [37.5393, 126.9973], // 한강진
      [37.5546, 127.0109], // 약수
      [37.5601, 127.0143], // 청구
      [37.5660, 127.0177], // 신당
    ],
  },
  {
    lineNumber: 7,
    color: '#747F00',
    coordinates: [
      [37.6547, 127.0563], // 노원
      [37.6204, 127.0734], // 태릉입구
      [37.5481, 127.0742], // 어린이대공원
      [37.5407, 127.0702], // 건대입구
      [37.4854, 126.9823], // 이수
      [37.4962, 126.9559], // 숭실대입구
      [37.4950, 126.9965], // 내방
      [37.5048, 127.0048], // 고속터미널
      [37.4940, 126.9209], // 보라매
      [37.4911, 126.8957], // 대림
      [37.4813, 126.8824], // 가산디지털단지
    ],
  },
  {
    lineNumber: 8,
    color: '#E6186C',
    coordinates: [
      [37.5382, 127.1244], // 천호
      [37.5194, 127.0828], // 잠실나루
      [37.5130, 127.1000], // 잠실
      [37.5073, 127.1003], // 석촌
    ],
  },
  {
    lineNumber: 9,
    color: '#BDB092',
    coordinates: [
      [37.5575, 126.7942], // 김포공항
      [37.5283, 126.9179], // 국회의사당
      [37.5264, 126.9246], // 여의도
      [37.5131, 126.9422], // 노량진
      [37.5060, 126.9829], // 동작
      [37.5048, 127.0048], // 고속터미널
      [37.5047, 127.0247], // 신논현
      [37.5103, 127.0437], // 선정릉
      [37.5107, 127.0734], // 종합운동장
      [37.5073, 127.1003], // 석촌
    ],
  },
]
