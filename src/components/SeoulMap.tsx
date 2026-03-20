import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'

interface Point {
  x: number
  y: number
}

interface Transform {
  x: number
  y: number
  scale: number
}

const INITIAL_SCALE = 1
const MIN_SCALE = 0.5
const MAX_SCALE = 4

interface SeoulMapProps {
  children?: ReactNode
}

export default function SeoulMap({ children }: SeoulMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: INITIAL_SCALE })

  // Pan state
  const isPanning = useRef(false)
  const lastPoint = useRef<Point>({ x: 0, y: 0 })

  // Pinch state
  const lastPinchDist = useRef<number | null>(null)

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isPanning.current = true
    lastPoint.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPoint.current.x
    const dy = e.clientY - lastPoint.current.y
    lastPoint.current = { x: e.clientX, y: e.clientY }
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(t => ({ ...t, scale: clampScale(t.scale * factor) }))
  }, [])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isPanning.current = true
      lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastPinchDist.current = null
    } else if (e.touches.length === 2) {
      isPanning.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPoint.current.x
      const dy = e.touches[0].clientY - lastPoint.current.y
      lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const factor = dist / lastPinchDist.current
      lastPinchDist.current = dist
      setTransform(t => ({ ...t, scale: clampScale(t.scale * factor) }))
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    isPanning.current = false
    lastPinchDist.current = null
  }, [])

  // Prevent default wheel on container to allow custom zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
          willChange: 'transform',
        }}
      >
        <SeoulSVG>{children}</SeoulSVG>
      </div>
    </div>
  )
}

function SeoulSVG({ children }: { children?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 800 700"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-label="서울시 지도"
    >
      {/* Sky gradient background */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4f1c0" />
          <stop offset="100%" stopColor="#e8f8d8" />
        </linearGradient>
        <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8d8ea" />
          <stop offset="100%" stopColor="#87c5dc" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="700" fill="url(#skyGrad)" />

      {/* Districts - 25 Seoul-gu */}
      {DISTRICTS.map(d => (
        <path
          key={d.id}
          id={d.id}
          d={d.path}
          fill={d.fill}
          stroke="#b0d8a0"
          strokeWidth="1.5"
          opacity="0.9"
        />
      ))}

      {/* District labels */}
      {DISTRICT_LABELS.map(l => (
        <text
          key={l.id}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize="9"
          fill="#4a7c59"
          fontWeight="600"
          opacity="0.8"
        >
          {l.name}
        </text>
      ))}

      {/* Han River */}
      <path
        d={HAN_RIVER_PATH}
        fill="url(#riverGrad)"
        stroke="#6bb5cc"
        strokeWidth="1"
        opacity="0.85"
      />
      <text x="380" y="415" textAnchor="middle" fontSize="11" fill="#4a8fa8" fontWeight="500" opacity="0.7">
        한강
      </text>

      {/* Major roads */}
      {MAJOR_ROADS.map((r, i) => (
        <path
          key={i}
          d={r}
          fill="none"
          stroke="#c8e0b8"
          strokeWidth="2"
          opacity="0.6"
        />
      ))}

      {/* Children overlay (e.g. hotspot markers) */}
      {children}
    </svg>
  )
}

// Seoul districts with approximate SVG paths (800x700 viewport)
// Districts ordered roughly N→S, W→E
const DISTRICTS = [
  // Dobong-gu (도봉구) - north
  { id: 'dobong', fill: '#c8e6c9', path: 'M 370 30 L 420 25 L 450 50 L 440 90 L 400 100 L 365 80 Z' },
  // Nowon-gu (노원구) - northeast
  { id: 'nowon', fill: '#dcedc8', path: 'M 420 25 L 490 20 L 520 55 L 500 95 L 460 105 L 440 90 L 450 50 Z' },
  // Jungnang-gu (중랑구) - east
  { id: 'jungnang', fill: '#c8e6c9', path: 'M 490 70 L 530 60 L 545 110 L 510 140 L 480 130 L 470 100 L 500 95 L 520 55 Z' },
  // Gangbuk-gu (강북구) - north center
  { id: 'gangbuk', fill: '#dcedc8', path: 'M 330 40 L 370 30 L 365 80 L 340 100 L 305 85 L 310 55 Z' },
  // Seongbuk-gu (성북구) - north center
  { id: 'seongbuk', fill: '#c8e6c9', path: 'M 365 80 L 400 100 L 420 130 L 390 155 L 355 145 L 340 100 Z' },
  // Eunpyeong-gu (은평구) - northwest
  { id: 'eunpyeong', fill: '#dcedc8', path: 'M 235 55 L 310 55 L 305 85 L 310 120 L 270 130 L 240 100 L 225 75 Z' },
  // Jongno-gu (종로구) - center
  { id: 'jongno', fill: '#b8dbb8', path: 'M 310 120 L 355 145 L 360 175 L 330 185 L 295 170 L 285 145 L 295 125 Z' },
  // Seodaemun-gu (서대문구) - west center
  { id: 'seodaemun', fill: '#c8e6c9', path: 'M 240 100 L 270 130 L 310 120 L 295 125 L 285 145 L 255 155 L 230 135 L 225 110 Z' },
  // Dobong extension / Mapo-gu area check
  // Jung-gu (중구) - center
  { id: 'jung', fill: '#a5d6a7', path: 'M 330 185 L 360 175 L 380 195 L 365 220 L 335 215 L 320 200 Z' },
  // Nowon extension
  // Dongdaemun-gu (동대문구) - center east
  { id: 'dongdaemun', fill: '#dcedc8', path: 'M 390 155 L 430 150 L 445 175 L 420 200 L 390 195 L 380 175 Z' },
  // Seongdong-gu (성동구) - center east
  { id: 'seongdong', fill: '#c8e6c9', path: 'M 420 200 L 460 185 L 480 210 L 465 250 L 430 250 L 405 230 L 400 205 Z' },
  // Gwangjin-gu (광진구) - east
  { id: 'gwangjin', fill: '#dcedc8', path: 'M 460 185 L 510 175 L 530 210 L 520 250 L 480 255 L 465 250 L 480 210 Z' },
  // Mapo-gu (마포구) - west
  { id: 'mapo', fill: '#c8e6c9', path: 'M 195 170 L 255 155 L 285 145 L 295 170 L 300 200 L 270 225 L 240 215 L 210 200 Z' },
  // Yongsan-gu (용산구) - center south
  { id: 'yongsan', fill: '#b8dbb8', path: 'M 295 200 L 335 215 L 365 220 L 375 250 L 350 270 L 310 265 L 295 240 Z' },
  // Yangcheon-gu (양천구) - southwest
  { id: 'yangcheon', fill: '#dcedc8', path: 'M 165 290 L 210 280 L 235 305 L 225 345 L 185 350 L 160 325 Z' },
  // Gangseo-gu (강서구) - far west
  { id: 'gangseo', fill: '#c8e6c9', path: 'M 100 250 L 165 240 L 200 265 L 210 300 L 165 310 L 130 300 L 105 275 Z' },
  // Guro-gu (구로구) - southwest
  { id: 'guro', fill: '#dcedc8', path: 'M 175 350 L 225 345 L 250 370 L 240 405 L 200 410 L 170 390 Z' },
  // Geumcheon-gu (금천구) - south
  { id: 'geumcheon', fill: '#c8e6c9', path: 'M 200 410 L 240 405 L 255 430 L 240 460 L 205 455 L 190 430 Z' },
  // Dongjak-gu (동작구) - south center
  { id: 'dongjak', fill: '#dcedc8', path: 'M 280 365 L 340 360 L 355 395 L 335 425 L 295 425 L 270 400 Z' },
  // Gwanak-gu (관악구) - south
  { id: 'gwanak', fill: '#c8e6c9', path: 'M 255 430 L 295 425 L 335 425 L 345 460 L 315 485 L 275 480 L 250 455 Z' },
  // Seocho-gu (서초구) - south
  { id: 'seocho', fill: '#b8dbb8', path: 'M 350 380 L 415 375 L 435 415 L 415 455 L 375 460 L 345 440 L 340 405 Z' },
  // Gangnam-gu (강남구) - southeast
  { id: 'gangnam', fill: '#c8e6c9', path: 'M 415 355 L 480 350 L 510 390 L 500 440 L 455 455 L 420 450 L 410 415 Z' },
  // Songpa-gu (송파구) - east south
  { id: 'songpa', fill: '#dcedc8', path: 'M 480 350 L 545 345 L 565 385 L 550 430 L 515 445 L 490 440 L 500 400 Z' },
  // Gangdong-gu (강동구) - far east south
  { id: 'gangdong', fill: '#c8e6c9', path: 'M 530 300 L 580 295 L 600 340 L 580 380 L 545 385 L 520 355 L 525 320 Z' },
  // Nowon south extension
  // Jungnang south
]

const DISTRICT_LABELS = [
  { id: 'l-dobong', name: '도봉', x: 407, y: 65 },
  { id: 'l-nowon', name: '노원', x: 470, y: 65 },
  { id: 'l-jungnang', name: '중랑', x: 515, y: 105 },
  { id: 'l-gangbuk', name: '강북', x: 340, y: 68 },
  { id: 'l-seongbuk', name: '성북', x: 383, y: 125 },
  { id: 'l-eunpyeong', name: '은평', x: 272, y: 95 },
  { id: 'l-jongno', name: '종로', x: 323, y: 155 },
  { id: 'l-seodaemun', name: '서대문', x: 265, y: 132 },
  { id: 'l-jung', name: '중', x: 350, y: 202 },
  { id: 'l-dongdaemun', name: '동대문', x: 415, y: 175 },
  { id: 'l-seongdong', name: '성동', x: 443, y: 222 },
  { id: 'l-gwangjin', name: '광진', x: 495, y: 220 },
  { id: 'l-mapo', name: '마포', x: 248, y: 192 },
  { id: 'l-yongsan', name: '용산', x: 335, y: 240 },
  { id: 'l-yangcheon', name: '양천', x: 197, y: 318 },
  { id: 'l-gangseo', name: '강서', x: 155, y: 277 },
  { id: 'l-guro', name: '구로', x: 210, y: 380 },
  { id: 'l-geumcheon', name: '금천', x: 220, y: 435 },
  { id: 'l-dongjak', name: '동작', x: 312, y: 395 },
  { id: 'l-gwanak', name: '관악', x: 297, y: 455 },
  { id: 'l-seocho', name: '서초', x: 390, y: 418 },
  { id: 'l-gangnam', name: '강남', x: 460, y: 405 },
  { id: 'l-songpa', name: '송파', x: 522, y: 395 },
  { id: 'l-gangdong', name: '강동', x: 558, y: 340 },
]

// Han River - flows west to east across the southern middle of Seoul
const HAN_RIVER_PATH = `
  M 90 370
  C 130 360, 160 355, 200 358
  C 230 360, 250 365, 280 368
  C 300 370, 310 372, 325 368
  C 340 364, 350 355, 370 352
  C 390 349, 410 348, 430 350
  C 455 353, 475 358, 500 355
  C 525 352, 545 345, 570 348
  C 595 351, 620 360, 650 358
  L 650 395
  C 620 398, 595 392, 570 390
  C 545 388, 525 382, 500 385
  C 475 388, 455 393, 430 390
  C 410 388, 390 382, 370 382
  C 350 382, 340 385, 325 388
  C 310 391, 300 392, 280 390
  C 250 387, 230 382, 200 380
  C 160 377, 130 380, 90 390
  Z
`

const MAJOR_ROADS = [
  // Olympic Expressway (east-west, south of Han River)
  'M 90 440 C 200 435 350 430 500 432 C 580 433 630 435 700 440',
  // Gangbyeon Expressway (along north bank of Han)
  'M 90 355 C 200 350 350 345 500 348 C 580 350 630 352 700 355',
  // Nambusunhwan-ro (north-south in west)
  'M 220 200 C 222 280 225 350 228 430',
  // Dongbu Expressway
  'M 530 150 C 535 220 540 290 545 360',
]
