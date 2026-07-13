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
const MODE_HINTS: Record<DesignerMode, string> = {
  position: 'Click and drag any player to reposition',
  path: 'Click a player, then click to lay path waypoints',
  throw: 'Click and drag disc to the receiver',
}

type DiscDrag = { holderIndex: number; cursorPx: number; cursorPy: number; hoverIndex: number | null; pointerType: string }

export function DesignerCanvas({ designer, onPositionDragComplete }: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [discDrag, setDiscDrag] = useState<DiscDrag | null>(null)
  const {
    currentStep, mode, selectedIndex, selectToken, moveToken,
    inProgressPath, startPath, addWaypoint, setThrow, set, category, pathType,
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
    if (mode !== 'path' || !inProgressPath) return
    const point = toSvgPoint(e.clientX, e.clientY)
    addWaypoint(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handleTokenClick(index: number) {
    if (mode === 'position') {
      selectToken(index)
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

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handleBackgroundPointerDown}
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
            draggable={mode === 'position' || (mode === 'throw' && i === holderIndex)}
            toSvgPoint={toSvgPoint}
            onMove={(x, y, pointerType) => {
              if (mode === 'throw' && i === holderIndex) {
                handleHolderDragMove(x, y, pointerType)
              } else if (mode === 'position') {
                moveToken(i, x, y)
              }
            }}
            onDragStart={mode === 'position' ? beginDrag : undefined}
            onDragEnd={
              mode === 'throw' && i === holderIndex
                ? handleHolderDragEnd
                : mode === 'position'
                ? handlePositionDragEnd
                : undefined
            }
            onDragCancel={
              mode === 'throw' && i === holderIndex
                ? () => setDiscDrag(null)
                : mode === 'position'
                ? cancelDrag
                : undefined
            }
            onClick={() => handleTokenClick(i)}
          />
        ))}
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-raised/90 border border-accent text-xs text-text pointer-events-none">
        {MODE_HINTS[mode]}
      </div>
    </>
  )
}
