# 서울 타이쿤 (Seoul Tycoon)

서울시 실시간 인구 혼잡도를 귀여운 캐릭터와 함께 시각화하는 지도 앱.

## Features

- **MapLibre GL JS** 기반 실시간 인터랙티브 지도 (Snap Map 스타일 파스텔 커스텀 스타일)
- 122개 주요 장소 실시간 혼잡도 마커 (GeoJSON + 색상 코드)
- PixiJS 8 기반 귀여운 캐릭터 (지도 지리 좌표 기반 이동)
- 실시간 날씨 애니메이션 (맑음/흐림/비/눈/미세먼지, 주야간 모드)
- 날씨 & 대기질 배지 (상단 바)
- 장소 클릭 시 상세 팝업 (하단 시트)
- 서울 경계 오버레이, 줌 컨트롤, 나침반
- 5분마다 자동 갱신

## Tech Stack

- React 18 + TypeScript 5
- Vite 8
- **MapLibre GL JS** (오픈소스 인터랙티브 지도, OpenFreeMap 벡터 타일)
- PixiJS 8 (캐릭터 애니메이션)
- Tailwind CSS 4
- Seoul Open Data API (OA-21285)

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and add your Seoul Open Data API key:
   ```
   VITE_SEOUL_API_KEY=your_api_key_here
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## API Key

Get a free API key at [Seoul Open Data Plaza](https://data.seoul.go.kr).

Search for: `서울시 주요 122장소 도시데이터 (OA-21285)`

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run unit tests
npm run preview  # Preview production build
```

## Deployment

Configured for Vercel. Push to `main` branch to deploy automatically.

Add `VITE_SEOUL_API_KEY` as an environment variable in Vercel project settings.
