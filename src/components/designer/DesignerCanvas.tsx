'use client'
import { useRef, useState } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { DraggableToken } from './DraggableToken'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { DesignerMode } from '@/types/designer'

type DesignerCanvasProps = {
  designer: ReturnType<typeof useDesignerState>
  onPositionDragComplete?: () => void
}

// Catch radius for the "nearest eligible token" search while dragging the
// disc — generous enough for a fingertip's imprecision on touch, tighter
// for pointer-precise mouse/pen input.
const POINTER_CATCH_RADIUS = 4.5
const TOUCH_CATCH_RADIUS = 7.5
// How far above the actual touch point to draw the dragged disc, so a
// finger never covers the disc or the highlighted candidate underneath it.
const TOUCH_DISC_LIFT = 8
const HOLDER_RING = '#a3e635'
const RECEIVER_RING = '#4ade80'
// Below this (in normalized 0-1 field units), a marquee drag is treated as
// a plain click on empty canvas rather than a deliberate selection box.
const MARQUEE_MIN_SIZE = 0.01
const PATH_TYPES = ['primary', 'secondary', 'clear', 'reset'] as const
const MODE_HINTS: Record<DesignerMode, string> = {
  position: 'Click and drag any player to reposition',
  possession: 'Click a player to set who has possession of the disc',
  path: 'Click a player, then click to lay path waypoints',
  throw: 'Click and drag disc to the receiver',
  select: 'Drag a box to select players, then drag any of them to move the group',
}

type DiscDrag = { holderIndex: number; cursorPx: number; cursorPy: number; hoverIndex: number | null; pointerType: string }
type MarqueePoint = { x: number; y: number }
type GroupDragOrigin = { index: number; x: number; y: number }[]

export function DesignerCanvas({ designer, onPositionDragComplete }: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [discDrag, setDiscDrag] = useState<DiscDrag | null>(null)
  const [marqueeStart, setMarqueeStart] = useState<MarqueePoint | null>(null)
  const [marqueeEnd, setMarqueeEnd] = useState<MarqueePoint | null>(null)
  const groupDragOriginRef = useRef<GroupDragOrigin | null>(null)
  const {
    currentStep, mode, selectedIndex, selectToken, moveToken,
    multiSelected, setMultiSelected, moveMultiSelection,
    inProgressPath, startPath, addWaypoint, finishPath, cancelPath, setThrow, set, category,
    pathType, setPathType, setDiscHolder,
    beginDrag, endDrag, cancelDrag,
  } = designer
  const showEndzone = set === 'endzone'
  const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(ctm.inverse())
    return { x: transformed.x / FIELD_WIDTH, y: transformed.y / FIELD_HEIGHT }
  }

  function findHoverTarget(cursorPx: number, cursorPy: number, radius: number): number | null {
    let closest: { index: number; dist: number } | null = null
    for (let i = 0; i < currentStep.players.length; i++) {
      const p = currentStep.players[i]
      if (i === holderIndex || p.isDefense) continue
      const target = toPixel(p.x, p.y)
      const dist = Math.hypot(target.px - cursorPx, target.py - cursorPy)
      if (dist <= radius && (!closest || dist < closest.dist)) {
        closest = { index: i, dist }
      }
    }
    return closest ? closest.index : null
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === 'path' && inProgressPath) {
      const point = toSvgPoint(e.clientX, e.clientY)
      addWaypoint(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
      return
    }
    if (mode === 'select') {
      const point = toSvgPoint(e.clientX, e.clientY)
      const clamped = { x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) }
      setMarqueeStart(clamped)
      setMarqueeEnd(clamped)
    }
  }

  function handleBackgroundPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (mode !== 'select' || !marqueeStart) return
    const point = toSvgPoint(e.clientX, e.clientY)
    setMarqueeEnd({ x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) })
  }

  function handleBackgroundPointerUp() {
    if (mode !== 'select' || !marqueeStart || !marqueeEnd) return
    const x1 = Math.min(marqueeStart.x, marqueeEnd.x)
    const x2 = Math.max(marqueeStart.x, marqueeEnd.x)
    const y1 = Math.min(marqueeStart.y, marqueeEnd.y)
    const y2 = Math.max(marqueeStart.y, marqueeEnd.y)
    if (x2 - x1 < MARQUEE_MIN_SIZE && y2 - y1 < MARQUEE_MIN_SIZE) {
      setMultiSelected([])
    } else {
      const matched = currentStep.players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2)
        .map(({ i }) => i)
      setMultiSelected(matched)
    }
    setMarqueeStart(null)
    setMarqueeEnd(null)
  }

  function handleTokenClick(index: number) {
    if (mode === 'position') {
      selectToken(index)
      return
    }
    if (mode === 'possession') {
      // Offense-only for now (will expand to defense later).
      if (!currentStep.players[index].isDefense) setDiscHolder(index)
      return
    }
    if (mode === 'path') {
      if (!inProgressPath) startPath(index)
      return
    }
    if (mode === 'throw') {
      if (!currentStep.players[index].isDefense) selectToken(index)
      return
    }
  }

  function handleHolderDragMove(fieldX: number, fieldY: number, pointerType: string) {
    const { px, py } = toPixel(fieldX, fieldY)
    const radius = pointerType === 'touch' ? TOUCH_CATCH_RADIUS : POINTER_CATCH_RADIUS
    setDiscDrag({ holderIndex, cursorPx: px, cursorPy: py, hoverIndex: findHoverTarget(px, py, radius), pointerType })
  }

  function handleHolderDragEnd() {
    if (discDrag?.hoverIndex != null) {
      setThrow(holderIndex, discDrag.hoverIndex)
    }
    setDiscDrag(null)
  }

  function handlePositionDragEnd() {
    endDrag()
    onPositionDragComplete?.()
  }

  function handleSelectDragStart(index: number) {
    const group = multiSelected.includes(index) ? multiSelected : [index]
    if (group !== multiSelected) setMultiSelected(group)
    groupDragOriginRef.current = group.map((i) => ({ index: i, x: currentStep.players[i].x, y: currentStep.players[i].y }))
    beginDrag()
  }

  function handleSelectDragMove(index: number, x: number, y: number) {
    const origin = groupDragOriginRef.current
    if (!origin) return
    const self = origin.find((o) => o.index === index)
    if (!self) return
    moveMultiSelection(x - self.x, y - self.y, origin)
  }

  function handleSelectDragEnd() {
    groupDragOriginRef.current = null
    endDrag()
  }

  function handleSelectDragCancel() {
    groupDragOriginRef.current = null
    cancelDrag()
  }

  function ringColorFor(index: number): string | null {
    if (mode === 'throw') {
      if (discDrag) {
        if (index === discDrag.holderIndex) return HOLDER_RING
        if (index === discDrag.hoverIndex) return 'white'
        return null
      }
      if (index === holderIndex) return HOLDER_RING
      const player = currentStep.players[index]
      if (!player.isDefense && currentStep.throw?.to === player.id) return RECEIVER_RING
      return selectedIndex === index ? 'white' : null
    }
    if (mode === 'select') {
      return multiSelected.includes(index) ? 'white' : null
    }
    if (mode === 'possession') {
      return index === holderIndex ? HOLDER_RING : null
    }
    return selectedIndex === index ? 'white' : null
  }

  const finishedPaths = currentStep.pathPreviews.map((path, i) => {
    const points = path.points.map((pt) => {
      const { px, py } = toPixel(pt.x, pt.y)
      return `${px},${py}`
    }).join(' ')
    return (
      <polyline
        key={`${path.playerId}-${i}`}
        points={points}
        fill="none"
        stroke={PATH_COLOR[path.type]}
        strokeWidth={0.6}
        strokeDasharray="2,1.5"
      />
    )
  })

  const inProgressLine = inProgressPath && inProgressPath.points.length > 1 && (
    <polyline
      points={inProgressPath.points.map((pt) => {
        const { px, py } = toPixel(pt.x, pt.y)
        return `${px},${py}`
      }).join(' ')}
      fill="none"
      stroke={PATH_COLOR[pathType]}
      strokeWidth={0.6}
      strokeDasharray="2,1.5"
      opacity={0.6}
    />
  )

  const marqueeRect = marqueeStart && marqueeEnd && (() => {
    const start = toPixel(Math.min(marqueeStart.x, marqueeEnd.x), Math.min(marqueeStart.y, marqueeEnd.y))
    const end = toPixel(Math.max(marqueeStart.x, marqueeEnd.x), Math.max(marqueeStart.y, marqueeEnd.y))
    return (
      <rect
        x={start.px}
        y={start.py}
        width={end.px - start.px}
        height={end.py - start.py}
        fill="rgba(163,230,53,0.15)"
        stroke="#a3e635"
        strokeWidth={0.4}
        strokeDasharray="1.5,1"
        pointerEvents="none"
      />
    )
  })()

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
      >
        <FieldBackground showEndzone={showEndzone} />
        {finishedPaths}
        {inProgressLine}
        {currentStep.players.map((player, i) => (
          <DraggableToken
            key={i}
            x={player.x}
            y={player.y}
            label={player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id}
            isDefense={!!player.isDefense}
            playCategory={category}
            ringColor={ringColorFor(i)}
            isDiscHolder={!!player.hasDisc}
            draggable={mode === 'position' || (mode === 'throw' && i === holderIndex) || mode === 'select'}
            toSvgPoint={toSvgPoint}
            onMove={(x, y, pointerType) => {
              if (mode === 'throw' && i === holderIndex) {
                handleHolderDragMove(x, y, pointerType)
              } else if (mode === 'position') {
                moveToken(i, x, y)
              } else if (mode === 'select') {
                handleSelectDragMove(i, x, y)
              }
            }}
            onDragStart={
              mode === 'position'
                ? beginDrag
                : mode === 'select'
                ? () => handleSelectDragStart(i)
                : undefined
            }
            onDragEnd={
              mode === 'throw' && i === holderIndex
                ? handleHolderDragEnd
                : mode === 'position'
                ? handlePositionDragEnd
                : mode === 'select'
                ? handleSelectDragEnd
                : undefined
            }
            onDragCancel={
              mode === 'throw' && i === holderIndex
                ? () => setDiscDrag(null)
                : mode === 'position'
                ? cancelDrag
                : mode === 'select'
                ? handleSelectDragCancel
                : undefined
            }
            onClick={() => handleTokenClick(i)}
          />
        ))}
        {marqueeRect}
        {discDrag && (
          <>
            {discDrag.pointerType === 'touch' && (
              <ellipse
                cx={discDrag.cursorPx}
                cy={discDrag.cursorPy}
                rx={2}
                ry={1}
                fill="black"
                opacity={0.35}
                pointerEvents="none"
              />
            )}
            <circle
              cx={discDrag.cursorPx}
              cy={discDrag.pointerType === 'touch' ? discDrag.cursorPy - TOUCH_DISC_LIFT : discDrag.cursorPy}
              r={1.4}
              fill="white"
              stroke="black"
              strokeWidth={0.2}
              pointerEvents="none"
            />
          </>
        )}
      </svg>
      {mode === 'path' && inProgressPath ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-raised/90 border border-white text-xs text-text">
          {PATH_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setPathType(t)}
              title={t}
              aria-label={`${t} path`}
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: PATH_COLOR[t], borderColor: pathType === t ? 'white' : 'transparent' }}
            />
          ))}
          <button onClick={finishPath} className="px-2.5 py-1 rounded-md border border-accent text-accent">
            Finish Path
          </button>
          <button onClick={cancelPath} className="px-2.5 py-1 rounded-md border border-border text-text-muted">
            Cancel
          </button>
        </div>
      ) : (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-surface-raised/90 border border-white text-xs text-text text-center pointer-events-none">
          {MODE_HINTS[mode]}
        </div>
      )}
    </>
  )
}
