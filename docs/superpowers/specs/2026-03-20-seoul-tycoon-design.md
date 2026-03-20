# Seoul Tycoon - Design Spec

## Overview

Seoul Tycoon is a real-time Seoul population visualization web app styled like a cute tycoon game. Users see a simplified Seoul map with animated walking characters representing population density, live weather animations, and air quality indicators. The primary use case is helping people decide "where should I go today?" by showing congestion, weather, and air quality at a glance.

## Target Users

People planning to go out in Seoul who want to quickly assess:
- How crowded a destination is right now
- Current weather conditions
- Air quality (fine dust) levels

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite |
| Game Rendering | PixiJS 8 (sprite animation, character rendering) |
| Map | Custom SVG (simplified Seoul districts) |
| Data | Seoul Open Data API (OA-21285 Integrated Real-time API) |
| Styling | Tailwind CSS |
| Deployment | Vercel or GitHub Pages |

## Architecture

Full client-side application. No backend server.

### API Key Management
- API key stored in `.env` file as `VITE_SEOUL_API_KEY`
- Vite injects at build time via `import.meta.env.VITE_SEOUL_API_KEY`
- `.env` is gitignored; `.env.example` provided with placeholder
- Public repo safe: Seoul Open Data API keys are free and non-sensitive

```
Browser
├── React App (UI layer)
│   ├── TopBar (weather badge + air quality badge)
│   ├── SeoulMap (SVG map component)
│   ├── HotspotMarkers (122 clickable location markers)
│   ├── BottomSheet (selected area detail panel)
│   └── WeatherOverlay (rain/snow/dust CSS animations)
├── PixiJS Canvas (overlaid on map)
│   ├── CharacterManager (spawn/despawn based on population)
│   ├── Character sprites (walking animation)
│   └── Particle effects (weather particles if needed)
└── Data Layer
    ├── SeoulApiService (fetch population/weather/air data)
    ├── DataCache (in-memory, refresh every 5 min)
    └── LocationRegistry (122 hotspot coordinates on SVG)
```

## Visual Design

### Style: Flat & Kawaii
- Pastel color palette (soft greens, pinks, blues, yellows)
- Round, adorable characters with bouncy walk animations
- Soft shadows, rounded corners on all UI elements
- Clean, minimal UI overlays with backdrop blur

### Seoul Map
- Simplified SVG outline of Seoul's 25 districts (gu)
- Han River rendered as a soft blue curved path
- Major roads as light gray paths
- Pastel green fill with subtle district boundaries
- 122 hotspot locations marked with pulsing dots

### Characters (PixiJS Sprites)
- Tiny kawaii people (~12-16px) with:
  - Round colored head
  - Small body in random pastel-colored outfit
  - Animated walking legs
  - Bouncy movement
- Population density controls character count:
  - Congestion level "여유" (relaxed): 2-5 characters
  - "보통" (normal): 5-10 characters
  - "약간 붐빔" (slightly crowded): 10-20 characters
  - "붐빔" (crowded): 20-40 characters
- Characters walk randomly within their hotspot area radius
- Characters spawn/despawn smoothly with fade animations

### Weather Animations
Real-time weather data drives visual effects across the entire scene:

| Weather | Animation |
|---------|-----------|
| Clear/Sunny | Sun with pulse glow + drifting clouds |
| Cloudy | More clouds, dimmer sky gradient |
| Rain | Falling raindrop particles + darker sky |
| Snow | Falling snowflake particles + lighter sky |
| Fine Dust (bad air) | Hazy yellow-brown overlay + pulsing opacity |

Sky background gradient changes to match weather conditions.

### Hotspot Markers
- Small floating label with area name
- Pulsing dot colored by congestion level:
  - Green (#4caf50): relaxed
  - Orange (#ff9800): slightly crowded
  - Red (#ff6b6b): crowded
- Click/tap to select → shows detail in bottom sheet

### UI Overlays
- **Top bar**: Weather badge (icon + temp + description) + Air quality badge (PM2.5 level + color)
- **Bottom sheet**: Selected area name, congestion level, estimated population, demographics summary
- All overlays: semi-transparent white with backdrop blur, rounded corners

## Data Flow

1. On app load, fetch data for all 122 locations from Seoul Integrated API
2. Cache responses in memory (Map<areaName, data>)
3. Refresh every 5 minutes
4. On each data update:
   - Update character counts per hotspot
   - Update hotspot marker colors
   - Update weather animations
   - Update air quality badge
5. User clicks hotspot → bottom sheet shows detailed info

### API Details

**Seoul Integrated Real-time API (OA-21285)**
```
GET http://openapi.seoul.go.kr:8088/{KEY}/json/citydata/1/5/{AREA_NAME}
```

Response includes:
- `LIVE_PPLTN_STTS`: population data (congestion level, count range, demographics)
- `WEATHER_STTS`: weather (temp, humidity, precipitation, sky status)
- `AIR_STTS`: air quality (PM10, PM2.5, O3)

Limitation: 1 area per call → need 122 sequential/batched calls.

**Strategy**: Batch fetch with concurrency limit (5 parallel requests, conservative default). Cache results, stagger refresh across 5-minute window. Rate limit is not officially documented — test during initial implementation and adjust concurrency if needed.

## Component Breakdown

### React Components
1. **App** — root, manages global state
2. **SeoulMap** — renders SVG map, positions hotspot markers
3. **HotspotMarker** — individual clickable marker with label + dot
4. **PixiStage** — PixiJS canvas overlay for characters
5. **WeatherOverlay** — CSS weather animations (rain, snow, dust, clouds)
6. **TopBar** — weather badge + air quality badge
7. **BottomSheet** — slide-up detail panel for selected area
8. **LoadingScreen** — initial data fetch loading state

### PixiJS Classes
1. **CharacterManager** — manages character pool per hotspot
2. **Character** — individual sprite with walk animation
3. **CharacterPool** — object pool for performance

### Services
1. **SeoulApiService** — API calls, response parsing
2. **DataStore** — in-memory cache, refresh timer
3. **LocationRegistry** — maps 122 area names to SVG coordinates

## Interaction

- **Pan/Zoom**: Pinch-to-zoom and drag on the SVG map
- **Tap Hotspot**: Select area → bottom sheet slides up with details
- **Tap Map Background**: Dismiss bottom sheet
- **Auto-refresh**: Data updates every 5 minutes silently

## Responsive Design

- **Mobile-first**: Full viewport map, touch interactions
- **Desktop**: Same layout, mouse interactions, slightly larger UI elements
- **Breakpoints**: Single layout that scales, no separate desktop version

## Performance Considerations

- PixiJS sprite batching for efficient character rendering
- Object pool for character sprites (avoid GC pressure)
- Staggered API calls to avoid rate limits
- RequestAnimationFrame for smooth 60fps animations
- Lazy load area detail data (demographics) on hotspot click

## Error Handling

- API failure: Show cached data with "last updated X min ago" indicator
- Network offline: Show offline banner, keep displaying cached data
- Individual area fetch failure: Skip, retry on next cycle

## Out of Scope (v1)

- User accounts / favorites
- Historical data / trends
- Push notifications
- Native mobile app
- Transportation / parking data
- Commercial activity data
