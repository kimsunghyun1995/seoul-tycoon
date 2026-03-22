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

const MAX_SCALE = 6

const MAP_WIDTH = 800
const MAP_HEIGHT = 700

interface SeoulMapProps {
  children?: ReactNode
  overlay?: ReactNode
  scaleRef?: React.MutableRefObject<number>
}

export default function SeoulMap({ children, overlay, scaleRef }: SeoulMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const minScaleRef = useRef(0.5)
  const defaultTransformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })

  // Pan state
  const isPanning = useRef(false)
  const lastPoint = useRef<Point>({ x: 0, y: 0 })

  // Pinch state
  const lastPinchDist = useRef<number | null>(null)
  const isPinching = useRef(false)

  const clampScale = useCallback((s: number) => Math.min(MAX_SCALE, Math.max(minScaleRef.current, s)), [])

  // Compute initial transform: fit the map in the viewport with padding
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const scale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT) * 0.92
    minScaleRef.current = scale
    const x = (width - MAP_WIDTH * scale) / 2
    const y = (height - MAP_HEIGHT * scale) / 2
    const t = { x, y, scale }
    defaultTransformRef.current = t
    setTransform(t)
  }, [])

  // Sync external scaleRef for consumers like CharacterSystem
  useEffect(() => {
    if (scaleRef) scaleRef.current = transform.scale
  }, [transform.scale, scaleRef])

  const resetView = useCallback(() => {
    if (innerRef.current) innerRef.current.style.transition = 'transform 0.3s ease-out'
    setTransform(defaultTransformRef.current)
  }, [])

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

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    if (innerRef.current) innerRef.current.style.transition = 'transform 0.25s ease-out'
    setTransform(t => {
      const newScale = clampScale(t.scale * 2)
      const ratio = newScale / t.scale
      return { x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio, scale: newScale }
    })
  }, [clampScale])


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


  const onTouchEnd = useCallback(() => {
    isPanning.current = false
    lastPinchDist.current = null
    isPinching.current = false
    // Re-enable smooth transition after pinch ends
    if (innerRef.current) innerRef.current.style.transition = 'transform 0.15s ease-out'
  }, [])

  // Native non-passive wheel and touchmove handlers (React registers these as passive by default)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      // Smooth transition for wheel zoom
      if (innerRef.current) innerRef.current.style.transition = 'transform 0.15s ease-out'
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      // Zoom toward cursor: keep the map point under the cursor fixed
      setTransform(t => {
        const newScale = clampScale(t.scale * factor)
        const ratio = newScale / t.scale
        return { x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio, scale: newScale }
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isPanning.current) {
        const dx = e.touches[0].clientX - lastPoint.current.x
        const dy = e.touches[0].clientY - lastPoint.current.y
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // Disable transition during pinch to avoid lag
        if (!isPinching.current) {
          isPinching.current = true
          if (innerRef.current) innerRef.current.style.transition = 'none'
        }
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const factor = dist / lastPinchDist.current
        lastPinchDist.current = dist
        setTransform(t => ({ ...t, scale: clampScale(t.scale * factor) }))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={onDoubleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={innerRef}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: 'transform 0.15s ease-out',
          position: 'absolute',
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          willChange: 'transform',
        }}
      >
        <SeoulSVG>{children}</SeoulSVG>
        {overlay}
      </div>

      {/* Reset view button */}
      <button
        onClick={resetView}
        aria-label="지도 초기화"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(0,0,0,0.12)',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        ⌂
      </button>
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
      {/* Background - muted sage cream (illustrated tourism map style) */}
      <defs>
        <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ecfe8" />
          <stop offset="100%" stopColor="#7ab8d8" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="700" fill="#e8e6df" />

      {/* Gyeonggi-do surrounding region (simplified, non-interactive) */}
      <path
        d={GYEONGGI_PATH}
        fill="#dddad0"
        stroke="#c8c4b8"
        strokeWidth="1.5"
        opacity="0.8"
      />
      {/* Gyeonggi-do label in surrounding area */}
      <text x="90" y="40" textAnchor="middle" fontSize="11" fill="#a09888" fontWeight="500" opacity="0.8">경기도</text>
      <text x="700" y="350" textAnchor="middle" fontSize="11" fill="#a09888" fontWeight="500" opacity="0.8">경기도</text>
      <text x="350" y="668" textAnchor="middle" fontSize="11" fill="#a09888" fontWeight="500" opacity="0.8">경기도</text>

      {/* === MOUNTAINS (rendered behind districts) === */}

      {/* 북한산 / 도봉산 / 수락산 - North edge (largest mountain feature) */}
      <g>
        {/* Back layer - darkest */}
        <path d="M 158 95 C 210 40 272 5 320 18 C 358 3 402 -4 448 15 C 494 33 538 60 578 85 L 578 95 Z" fill="#4a7a4a" opacity="0.9" />
        {/* Mid layer */}
        <path d="M 182 95 C 228 52 278 28 316 38 C 350 26 388 24 425 44 C 463 60 505 75 538 90 L 538 95 Z" fill="#6a9c5c" opacity="0.9" />
        {/* Front layer - lightest */}
        <path d="M 212 95 C 248 66 282 50 312 54 C 340 46 365 50 392 64 C 416 75 445 84 472 92 L 472 95 Z" fill="#88b87a" opacity="0.9" />
        {/* Tree silhouettes along ridge */}
        <polygon points="258,63 254,72 262,72" fill="#2a5a2a" opacity="0.85" />
        <polygon points="280,49 276,58 284,58" fill="#2a5a2a" opacity="0.85" />
        <polygon points="312,39 308,48 316,48" fill="#2a5a2a" opacity="0.85" />
        <polygon points="346,32 342,41 350,41" fill="#2a5a2a" opacity="0.85" />
        <polygon points="382,28 378,37 386,37" fill="#2a5a2a" opacity="0.85" />
        <polygon points="418,27 414,36 422,36" fill="#2a5a2a" opacity="0.85" />
        <polygon points="450,37 446,46 454,46" fill="#2a5a2a" opacity="0.85" />
        <polygon points="482,52 478,61 486,61" fill="#2a5a2a" opacity="0.85" />
        <polygon points="512,66 508,75 516,75" fill="#2a5a2a" opacity="0.85" />
        <text x="342" y="15" textAnchor="middle" fontSize="7" fill="#2a5a2a" fontWeight="500" opacity="0.8">북한산</text>
      </g>

      {/* 인왕산 - Northwest, near Eunpyeong/Jongno */}
      <g>
        <path d="M 232 138 C 248 110 265 98 272 101 C 280 94 292 100 308 122 L 308 138 Z" fill="#4a7a4a" opacity="0.9" />
        <path d="M 238 138 C 252 116 267 106 272 108 C 279 102 290 106 303 126 L 303 138 Z" fill="#6a9c5c" opacity="0.9" />
        <path d="M 246 138 C 257 122 268 114 272 115 C 277 111 287 115 296 128 L 296 138 Z" fill="#88b87a" opacity="0.9" />
        <polygon points="269,106 265,115 273,115" fill="#2a5a2a" opacity="0.85" />
        <polygon points="276,100 272,109 280,109" fill="#2a5a2a" opacity="0.85" />
        <text x="270" y="95" textAnchor="middle" fontSize="6" fill="#2a5a2a" opacity="0.75">인왕산</text>
      </g>

      {/* 관악산 - South edge */}
      <g>
        <path d="M 246 528 C 264 496 284 476 312 476 C 334 470 360 478 380 496 C 390 508 392 520 390 528 Z" fill="#4a7a4a" opacity="0.9" />
        <path d="M 256 528 C 271 500 290 483 312 483 C 332 478 354 485 370 501 L 370 528 Z" fill="#6a9c5c" opacity="0.9" />
        <path d="M 268 528 C 280 506 295 494 312 496 C 328 491 347 498 358 510 L 358 528 Z" fill="#88b87a" opacity="0.9" />
        <polygon points="307,481 303,490 311,490" fill="#2a5a2a" opacity="0.85" />
        <polygon points="316,476 312,485 320,485" fill="#2a5a2a" opacity="0.85" />
        <polygon points="325,480 321,489 329,489" fill="#2a5a2a" opacity="0.85" />
        <text x="318" y="472" textAnchor="middle" fontSize="7" fill="#2a5a2a" fontWeight="500" opacity="0.8">관악산</text>
      </g>

      {/* 아차산 - East edge, near Gangdong */}
      <g>
        <path d="M 598 375 C 610 335 620 302 630 298 C 640 292 652 302 660 322 C 667 340 666 362 662 375 Z" fill="#4a7a4a" opacity="0.9" />
        <path d="M 603 375 C 614 338 622 310 630 306 C 638 302 649 310 656 328 C 662 344 661 363 658 375 Z" fill="#6a9c5c" opacity="0.9" />
        <path d="M 609 375 C 618 342 624 320 630 317 C 637 314 645 322 650 337 L 650 375 Z" fill="#88b87a" opacity="0.9" />
        <polygon points="627,305 623,314 631,314" fill="#2a5a2a" opacity="0.85" />
        <polygon points="633,299 629,308 637,308" fill="#2a5a2a" opacity="0.85" />
        <text x="632" y="295" textAnchor="middle" fontSize="7" fill="#2a5a2a" fontWeight="500" opacity="0.8">아차산</text>
      </g>

      {/* Districts - 25 Seoul-gu */}
      {DISTRICTS.map(d => (
        <path
          key={d.id}
          id={d.id}
          d={d.path}
          fill={d.fill}
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
          opacity="0.95"
        />
      ))}

      {/* 남산 - Center, rendered above districts for visibility */}
      <g opacity="0.78">
        <path d="M 314 268 C 324 244 333 230 341 232 C 350 226 360 231 368 250 L 368 268 Z" fill="#5a8a5a" />
        <path d="M 319 268 C 327 248 335 237 341 238 C 348 234 356 238 363 254 L 363 268 Z" fill="#7aaa6a" />
        <path d="M 326 268 C 332 252 338 244 341 245 C 345 243 352 246 357 258 L 357 268 Z" fill="#9ac88a" />
        <polygon points="338,237 334,246 342,246" fill="#2a5a2a" opacity="0.9" />
        <polygon points="344,231 340,240 348,240" fill="#2a5a2a" opacity="0.9" />
        <text x="341" y="227" textAnchor="middle" fontSize="6" fill="#2a5a2a" opacity="0.8">남산</text>
      </g>

      {/* District labels */}
      {DISTRICT_LABELS.map(l => (
        <text
          key={l.id}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize="9"
          fill="#8b5a52"
          fontWeight="700"
          opacity="0.85"
        >
          {l.name}
        </text>
      ))}

      {/* 중랑천 - stream from Jungnang-gu to Han River */}
      <path
        d={JUNGNANGCHEON_PATH}
        fill="none"
        stroke="#a0ccec"
        strokeWidth="2.5"
        opacity="0.8"
        strokeLinecap="round"
      />

      {/* 청계천 - stream through central Seoul */}
      <path
        d={CHEONGGYECHEON_PATH}
        fill="none"
        stroke="#a0ccec"
        strokeWidth="2"
        opacity="0.8"
        strokeLinecap="round"
      />
      <text x="390" y="208" textAnchor="middle" fontSize="6" fill="#4a8ab0" opacity="0.7">청계천</text>

      {/* Han River */}
      <path
        d={HAN_RIVER_PATH}
        fill="#8ec5e8"
        stroke="#6aadd4"
        strokeWidth="1"
        opacity="0.9"
      />

      {/* Han River wave highlight (subtle undulation along top edge) */}
      <path
        d="M 90 367 C 130 357, 160 352, 200 355 C 230 357, 250 362, 280 365 C 300 367, 310 369, 325 365 C 340 361, 350 352, 370 349 C 390 346, 410 345, 430 347 C 455 350, 475 355, 500 352 C 525 349, 545 342, 570 345 C 595 348, 620 357, 650 355"
        fill="none"
        stroke="#b8dff5"
        strokeWidth="1.5"
        opacity="0.5"
        strokeLinecap="round"
      />

      {/* Bridges over Han River */}
      {BRIDGES.map(b => (
        <g key={b.name}>
          <rect
            x={b.x - 3}
            y={b.topY}
            width={6}
            height={b.botY - b.topY}
            fill="#c0c8d0"
            opacity="0.88"
            rx="1"
          />
        </g>
      ))}

      <text x="380" y="420" textAnchor="middle" fontSize="11" fill="#3a7fa0" fontWeight="600" opacity="0.75">
        한강
      </text>

      {/* Major roads */}
      {MAJOR_ROADS.map((r, i) => (
        <path
          key={i}
          d={r}
          fill="none"
          stroke="#e8d8c8"
          strokeWidth="2"
          opacity="0.7"
        />
      ))}

      {/* === LANDMARKS (above districts, below hotspot markers) === */}

      {/* 경복궁 (Gyeongbokgung Palace) - Jongno-gu */}
      <g transform="translate(318, 158)">
        <rect x="-13" y="-6" width="26" height="10" fill="#d8c99a" stroke="#8b6a3a" strokeWidth="0.5" />
        <rect x="-10" y="-10" width="20" height="6" fill="#c4b080" stroke="#7a5a2a" strokeWidth="0.5" />
        <path d="M -15,-10 C -8,-22 8,-22 15,-10 Z" fill="#b84040" stroke="#8b2a2a" strokeWidth="0.5" />
        <line x1="-15" y1="-10" x2="15" y2="-10" stroke="#8b2a2a" strokeWidth="0.8" />
        <text x="0" y="12" textAnchor="middle" fontSize="7" fill="#6b3a28" fontWeight="600">경복궁</text>
      </g>

      {/* 남산타워 (N Seoul Tower) - on top of 남산 */}
      <g transform="translate(341, 237)">
        <rect x="-2.5" y="-28" width="5" height="22" fill="#909090" />
        <rect x="-5" y="-32" width="10" height="7" fill="#b0b0b8" rx="1" />
        <rect x="-3" y="-36" width="6" height="5" fill="#c0c0c8" rx="0.5" />
        <line x1="0" y1="-36" x2="0" y2="-43" stroke="#787880" strokeWidth="1.5" />
        <text x="0" y="-1" textAnchor="middle" fontSize="6" fill="#505060">남산타워</text>
      </g>

      {/* 월드컵경기장 (World Cup Stadium) - Mapo-gu */}
      <g transform="translate(205, 193)">
        <ellipse cx="0" cy="0" rx="14" ry="9" fill="none" stroke="#a0a098" strokeWidth="2.5" />
        <ellipse cx="0" cy="0" rx="10" ry="6" fill="#7ab870" opacity="0.75" />
        <path d="M -14,0 C -14,-14 14,-14 14,0" fill="none" stroke="#c8b870" strokeWidth="2" />
        <text x="0" y="18" textAnchor="middle" fontSize="6" fill="#506040">월드컵경기장</text>
      </g>

      {/* DDP (동대문디자인플라자) - Dongdaemun-gu */}
      <g transform="translate(420, 188)">
        <path d="M -13,5 C -16,-6 -9,-16 0,-15 C 9,-14 15,-4 13,5 Z" fill="#c4c8cc" stroke="#a0a8b0" strokeWidth="0.5" />
        <path d="M -9,3 C -11,-4 -6,-11 0,-11 C 6,-11 10,-3 8,3" fill="none" stroke="#e0e4e8" strokeWidth="1.2" />
        <text x="0" y="13" textAnchor="middle" fontSize="7" fill="#506070" fontWeight="600">DDP</text>
      </g>

      {/* 63빌딩 (63 Building) - Yeouido area */}
      <g transform="translate(230, 330)">
        <rect x="-5" y="-32" width="10" height="32" fill="#d4b030" stroke="#a88820" strokeWidth="0.5" />
        <line x1="-5" y1="-22" x2="5" y2="-22" stroke="#a88820" strokeWidth="0.5" />
        <line x1="-5" y1="-12" x2="5" y2="-12" stroke="#a88820" strokeWidth="0.5" />
        <rect x="-3" y="-35" width="6" height="4" fill="#c4a030" />
        <text x="0" y="9" textAnchor="middle" fontSize="6" fill="#806010">63빌딩</text>
      </g>

      {/* 국회의사당 (National Assembly) - Yeouido */}
      <g transform="translate(210, 348)">
        <rect x="-13" y="-4" width="26" height="9" fill="#d4d0c4" stroke="#a8a498" strokeWidth="0.5" />
        <line x1="-9" y1="-4" x2="-9" y2="-13" stroke="#b0a898" strokeWidth="1.5" />
        <line x1="9" y1="-4" x2="9" y2="-13" stroke="#b0a898" strokeWidth="1.5" />
        <rect x="-12" y="-15" width="24" height="4" fill="#c8c4b8" stroke="#a0a098" strokeWidth="0.5" />
        <ellipse cx="0" cy="-18" rx="8" ry="6" fill="#4a7a50" stroke="#3a6040" strokeWidth="0.5" />
        <text x="0" y="13" textAnchor="middle" fontSize="6" fill="#506040">국회의사당</text>
      </g>

      {/* 김포공항 (Gimpo Airport) - Gangseo-gu */}
      <g transform="translate(122, 268)">
        <rect x="-14" y="-2" width="28" height="4" fill="#d0d0c4" rx="1" stroke="#b0b0a0" strokeWidth="0.5" />
        <line x1="-8" y1="0" x2="8" y2="0" stroke="white" strokeWidth="0.8" strokeDasharray="3,2" />
        <rect x="-8" y="-10" width="16" height="8" fill="#c8c4b4" stroke="#a0a090" strokeWidth="0.5" rx="1" />
        <rect x="-6" y="-9" width="12" height="5" fill="#e0dcd0" rx="0.5" />
        <text x="0" y="11" textAnchor="middle" fontSize="6" fill="#505858">김포공항</text>
      </g>

      {/* 코엑스 (COEX) - Gangnam-gu */}
      <g transform="translate(462, 420)">
        <rect x="-16" y="-12" width="32" height="18" fill="#b8bcc8" stroke="#9098a8" strokeWidth="0.5" />
        <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#9098a8" strokeWidth="0.5" />
        <line x1="0" y1="-12" x2="0" y2="6" stroke="#9098a8" strokeWidth="0.5" />
        <rect x="-16" y="-16" width="32" height="5" fill="#c8ccd8" stroke="#9098a8" strokeWidth="0.5" />
        <text x="0" y="14" textAnchor="middle" fontSize="7" fill="#506070" fontWeight="600">코엑스</text>
      </g>

      {/* 롯데월드타워 (Lotte World Tower) - Songpa-gu */}
      <g transform="translate(532, 398)">
        <polygon points="-4,0 4,0 2.5,-30 -2.5,-30" fill="#c8ccd8" stroke="#a0a8b8" strokeWidth="0.5" />
        <polygon points="-2.5,-30 2.5,-30 1,-42 -1,-42" fill="#d8dce8" stroke="#a0a8b8" strokeWidth="0.5" />
        <line x1="0" y1="-42" x2="0" y2="-48" stroke="#909098" strokeWidth="1.2" />
        <text x="0" y="9" textAnchor="middle" fontSize="6" fill="#605070">롯데타워</text>
      </g>

      {/* 올림픽공원 (Olympic Park) - Songpa-gu */}
      <g transform="translate(548, 415)">
        <rect x="-10" y="-15" width="4" height="14" fill="#8b6a40" />
        <rect x="6" y="-15" width="4" height="14" fill="#8b6a40" />
        <rect x="-13" y="-17" width="26" height="4" fill="#8b6a40" />
        <path d="M -13,-17 C -13,-25 13,-25 13,-17" fill="#c04040" stroke="#8b2a2a" strokeWidth="0.5" />
        <circle cx="-4" cy="3" r="4" fill="#5a9050" opacity="0.85" />
        <circle cx="4" cy="3" r="4" fill="#6aaa60" opacity="0.85" />
        <text x="0" y="16" textAnchor="middle" fontSize="6" fill="#406030">올림픽공원</text>
      </g>

      {/* Children overlay (e.g. hotspot markers) */}
      {children}
    </svg>
  )
}

// Seoul districts with approximate SVG paths (800x700 viewport)
// Districts ordered roughly N→S, W→E
const DISTRICTS = [
  // Dobong-gu (도봉구) - north
  { id: 'dobong', fill: '#f5ddd8', path: 'M 370 30 L 420 25 L 450 50 L 440 90 L 400 100 L 365 80 Z' },
  // Nowon-gu (노원구) - northeast
  { id: 'nowon', fill: '#f7e2de', path: 'M 420 25 L 490 20 L 520 55 L 500 95 L 460 105 L 440 90 L 450 50 Z' },
  // Jungnang-gu (중랑구) - east
  { id: 'jungnang', fill: '#f2d5d0', path: 'M 490 70 L 530 60 L 545 110 L 510 140 L 480 130 L 470 100 L 500 95 L 520 55 Z' },
  // Gangbuk-gu (강북구) - north center
  { id: 'gangbuk', fill: '#f7e2de', path: 'M 330 40 L 370 30 L 365 80 L 340 100 L 305 85 L 310 55 Z' },
  // Seongbuk-gu (성북구) - north center
  { id: 'seongbuk', fill: '#f2d5d0', path: 'M 365 80 L 400 100 L 420 130 L 390 155 L 355 145 L 340 100 Z' },
  // Eunpyeong-gu (은평구) - northwest
  { id: 'eunpyeong', fill: '#f5ddd8', path: 'M 235 55 L 310 55 L 305 85 L 310 120 L 270 130 L 240 100 L 225 75 Z' },
  // Jongno-gu (종로구) - center
  { id: 'jongno', fill: '#f0ccc6', path: 'M 310 120 L 355 145 L 360 175 L 330 185 L 295 170 L 285 145 L 295 125 Z' },
  // Seodaemun-gu (서대문구) - west center
  { id: 'seodaemun', fill: '#f2d5d0', path: 'M 240 100 L 270 130 L 310 120 L 295 125 L 285 145 L 255 155 L 230 135 L 225 110 Z' },
  // Jung-gu (중구) - center
  { id: 'jung', fill: '#eecbc7', path: 'M 330 185 L 360 175 L 380 195 L 365 220 L 335 215 L 320 200 Z' },
  // Dongdaemun-gu (동대문구) - center east
  { id: 'dongdaemun', fill: '#f2d5d0', path: 'M 390 155 L 430 150 L 445 175 L 420 200 L 390 195 L 380 175 Z' },
  // Seongdong-gu (성동구) - center east
  { id: 'seongdong', fill: '#f0ccc6', path: 'M 420 200 L 460 185 L 480 210 L 465 250 L 430 250 L 405 230 L 400 205 Z' },
  // Gwangjin-gu (광진구) - east
  { id: 'gwangjin', fill: '#f2d5d0', path: 'M 460 185 L 510 175 L 530 210 L 520 250 L 480 255 L 465 250 L 480 210 Z' },
  // Mapo-gu (마포구) - west
  { id: 'mapo', fill: '#f0ccc6', path: 'M 195 170 L 255 155 L 285 145 L 295 170 L 300 200 L 270 225 L 240 215 L 210 200 Z' },
  // Yongsan-gu (용산구) - center south
  { id: 'yongsan', fill: '#eecbc7', path: 'M 295 200 L 335 215 L 365 220 L 375 250 L 350 270 L 310 265 L 295 240 Z' },
  // Yangcheon-gu (양천구) - southwest
  { id: 'yangcheon', fill: '#f2d5d0', path: 'M 165 290 L 210 280 L 235 305 L 225 345 L 185 350 L 160 325 Z' },
  // Gangseo-gu (강서구) - far west
  { id: 'gangseo', fill: '#f5ddd8', path: 'M 100 250 L 165 240 L 200 265 L 210 300 L 165 310 L 130 300 L 105 275 Z' },
  // Guro-gu (구로구) - southwest
  { id: 'guro', fill: '#f0ccc6', path: 'M 175 350 L 225 345 L 250 370 L 240 405 L 200 410 L 170 390 Z' },
  // Geumcheon-gu (금천구) - south
  { id: 'geumcheon', fill: '#eecbc7', path: 'M 200 410 L 240 405 L 255 430 L 240 460 L 205 455 L 190 430 Z' },
  // Dongjak-gu (동작구) - south center
  { id: 'dongjak', fill: '#f2d5d0', path: 'M 280 365 L 340 360 L 355 395 L 335 425 L 295 425 L 270 400 Z' },
  // Gwanak-gu (관악구) - south
  { id: 'gwanak', fill: '#eecbc7', path: 'M 255 430 L 295 425 L 335 425 L 345 460 L 315 485 L 275 480 L 250 455 Z' },
  // Seocho-gu (서초구) - south
  { id: 'seocho', fill: '#f0ccc6', path: 'M 350 380 L 415 375 L 435 415 L 415 455 L 375 460 L 345 440 L 340 405 Z' },
  // Gangnam-gu (강남구) - southeast
  { id: 'gangnam', fill: '#eac9c4', path: 'M 415 355 L 480 350 L 510 390 L 500 440 L 455 455 L 420 450 L 410 415 Z' },
  // Songpa-gu (송파구) - east south
  { id: 'songpa', fill: '#f2d5d0', path: 'M 480 350 L 545 345 L 565 385 L 550 430 L 515 445 L 490 440 L 500 400 Z' },
  // Gangdong-gu (강동구) - far east south
  { id: 'gangdong', fill: '#f0ccc6', path: 'M 530 300 L 580 295 L 600 340 L 580 380 L 545 385 L 520 355 L 525 320 Z' },
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

// Han River - flows west to east across the southern middle of Seoul (wider ~30-40px)
const HAN_RIVER_PATH = `
  M 90 362
  C 130 352, 160 347, 200 350
  C 230 352, 250 357, 280 360
  C 300 362, 310 364, 325 360
  C 340 356, 350 347, 370 344
  C 390 341, 410 340, 430 342
  C 455 345, 475 350, 500 347
  C 525 344, 545 337, 570 340
  C 595 343, 620 352, 650 350
  L 650 400
  C 620 403, 595 397, 570 395
  C 545 393, 525 387, 500 390
  C 475 393, 455 398, 430 395
  C 410 393, 390 387, 370 387
  C 350 387, 340 390, 325 393
  C 310 396, 300 397, 280 395
  C 250 392, 230 387, 200 385
  C 160 382, 130 385, 90 395
  Z
`

// Bridges crossing the Han River (x position, approx top/bottom bank y)
const BRIDGES = [
  { name: '양화대교', x: 210, topY: 350, botY: 385 },
  { name: '마포대교', x: 248, topY: 354, botY: 387 },
  { name: '원효대교', x: 282, topY: 358, botY: 392 },
  { name: '한강대교', x: 310, topY: 361, botY: 394 },
  { name: '반포대교', x: 358, topY: 346, botY: 387 },
  { name: '한남대교', x: 392, topY: 342, botY: 387 },
  { name: '성수대교', x: 442, topY: 341, botY: 395 },
  { name: '영동대교', x: 472, topY: 347, botY: 393 },
  { name: '잠실대교', x: 512, topY: 345, botY: 390 },
]

// 청계천 - thin stream flowing east through central Seoul
const CHEONGGYECHEON_PATH = `
  M 285 197
  C 305 193, 328 190, 352 192
  C 374 194, 398 198, 422 202
  C 444 206, 464 212, 482 218
`

// 중랑천 - stream from Jungnang-gu flowing south into Han River
const JUNGNANGCHEON_PATH = `
  M 532 88
  C 528 118, 524 148, 520 175
  C 516 202, 511 228, 507 255
  C 503 282, 500 312, 499 347
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

// Simplified Gyeonggi-do region surrounding Seoul (irregular shape, clockwise from NW)
const GYEONGGI_PATH = `
  M 20 10
  C 80 5, 200 2, 350 5
  C 500 8, 650 5, 760 15
  L 790 100
  C 795 200, 795 300, 790 420
  C 785 520, 790 600, 785 685
  L 650 690
  C 500 695, 350 695, 200 692
  L 60 688
  C 30 680, 12 650, 10 600
  L 8 400
  C 6 250, 10 130, 20 10
  Z
`
