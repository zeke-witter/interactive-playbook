'use client'
import { useRef } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { DraggableToken } from './DraggableToken'
import type { useDesignerState } from '@/hooks/useDesignerState'

type DesignerCanvasProps = {
  designer: ReturnType<typeof useDesignerState>
}

export function DesignerCanvas({ designer }: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    currentStep, mode, selectedIndex, selectToken, moveToken,
    inProgressPath, startPath, addWaypoint, setThrow, set, pathType,
  } = designer
  const showEndzone = set === 'endzone'

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
      if (!inProgressPath && !currentStep.players[index].isDefense) startPath(index)
      return
    }
    if (mode === 'throw') {
      const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)
      if (selectedIndex === null) {
        if (index === holderIndex) selectToken(index)
        return
      }
      if (selectedIndex === holderIndex && index !== holderIndex) {
        setThrow(selectedIndex, index)
        selectToken(null)
      }
    }
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
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
      className="w-full h-full"
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
          isSelected={selectedIndex === i}
          isDiscHolder={!!player.hasDisc}
          draggable={mode === 'position'}
          toSvgPoint={toSvgPoint}
          onMove={(x, y) => moveToken(i, x, y)}
          onClick={() => handleTokenClick(i)}
        />
      ))}
    </svg>
  )
}
