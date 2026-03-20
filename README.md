# 서울 타이쿤 (Seoul Tycoon)

서울시 실시간 인구 혼잡도를 귀여운 캐릭터와 함께 시각화하는 지도 앱.

## Features

- 서울 25개 자치구 SVG 지도 (팬/줌 지원)
- 122개 주요 장소 실시간 혼잡도 마커
- PixiJS 기반 귀여운 캐릭터 (혼잡도에 따라 수 변화)
- 실시간 날씨 애니메이션 (맑음/흐림/비/눈/미세먼지)
- 날씨 & 대기질 배지 (상단 바)
- 장소 클릭 시 상세 팝업 (하단 시트)
- 5분마다 자동 갱신

## Tech Stack

- React 18 + TypeScript 5
- Vite 8
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
