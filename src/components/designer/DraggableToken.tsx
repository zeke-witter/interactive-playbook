'use client'
import { useRef } from 'react'
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
  onDragEnd?: () => void
  onClick: () => void
}

export function DraggableToken({
  x, y, label, isDefense, ringColor, isDiscHolder, draggable, toSvgPoint, onMove, onDragEnd, onClick,
}: DraggableTokenProps) {
  const draggingRef = useRef(false)
  const movedRef = useRef(false)

  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    if (!draggable) return
    draggingRef.current = true
    movedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
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

  const { px, py } = toPixel(x, y)
  const fill = isDefense ? '#dc2626' : '#2563eb'

  return (
    <g
      transform={`translate(${px}, ${py})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: draggable ? 'grab' : 'pointer' }}
    >
      <circle r={3.2} fill={fill} />
      {ringColor && <circle r={4.2} fill="none" stroke={ringColor} strokeWidth={0.6} />}
      {isDiscHolder && <circle cx={2.4} cy={-2.4} r={1} fill="white" stroke="black" strokeWidth={0.2} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </g>
  )
}
