'use client'
import type { Position } from '@/types/play'

const ALL_POSITIONS: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']

type PositionSelectorProps = {
  value: Position
  onChange: (position: Position) => void
}

export function PositionSelector({ value, onChange }: PositionSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <span>🎯 You are:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Position)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {ALL_POSITIONS.map((pos) => (
          <option key={pos} value={pos}>{pos}</option>
        ))}
      </select>
    </label>
  )
}
