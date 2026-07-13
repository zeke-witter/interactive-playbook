'use client'
import { useRef, useState } from 'react'
import { toPixel } from '@/lib/field'

type DraggableTokenProps = {
  x: number
  y: number
  label: string
  isDefense: boolean
  ringColor: string | null
  isDiscHolder: boolean
  draggable: boolean
  toSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
  onMove: (x: number, y: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragCancel?: () => void
  onClick: () => void
}

export function DraggableToken({
  x, y, label, isDefense, ringColor, isDiscHolder, draggable, toSvgPoint, onMove, onDragStart, onDragEnd, onDragCancel, onClick,
}: DraggableTokenProps) {
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const [isHovering, setIsHovering] = useState(false)

  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    if (!draggable) return
    draggingRef.current = true
    movedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    onDragStart?.()
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!draggingRef.current) return
    movedRef.current = true
    const point = toSvgPoint(e.clientX, e.clientY)
    onMove(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    const wasDragging = draggingRef.current
    draggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (!wasDragging || !movedRef.current) {
      onClick()
    } else {
      onDragEnd?.()
    }
  }

  function handlePointerCancel(e: React.PointerEvent<SVGGElement>) {
    // Fires when the browser reclaims the gesture (e.g. a touch scroll,
    // an OS interruption) instead of a normal release. Reset drag state
    // without committing anything — a cancelled gesture is not a click
    // or a completed drag.
    const wasDragging = draggingRef.current
    draggingRef.current = false
    movedRef.current = false
    if (wasDragging) onDragCancel?.()
  }

  const { px, py } = toPixel(x, y)
  const fill = isDefense ? '#dc2626' : '#2563eb'

  return (
    <g
      transform={`translate(${px}, ${py})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
      style={{ cursor: draggable ? 'grab' : 'pointer' }}
    >
      <circle r={3.2} fill={fill} />
      {ringColor ? (
        <circle r={4.2} fill="none" stroke={ringColor} strokeWidth={0.6} />
      ) : (
        isHovering && <circle r={4.2} fill="none" stroke="#f4f4f5" strokeOpacity={0.25} strokeWidth={0.6} />
      )}
      {isDiscHolder && <circle cx={2.4} cy={-2.4} r={1} fill="white" stroke="black" strokeWidth={0.2} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </g>
  )
}
