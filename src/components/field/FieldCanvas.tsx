'use client'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import { FieldBackground } from './FieldBackground'
import { PathPreviews } from './PathPreviews'
import { PlayerTokens } from './PlayerTokens'
import { Disc } from './Disc'
import type { Play, PlayStep, Position } from '@/types/play'

type FieldCanvasProps = {
  step: PlayStep
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  playSet: Play['set']
  roster: Record<Position, string>
  onThrowComplete?: () => void
  highlightZone?: { x: number; y: number; width: number; height: number } | null
  onSelectPosition?: (position: Position) => void
}

export function FieldCanvas({ step, selectedPosition, playCategory, playSet, roster, onThrowComplete, highlightZone, onSelectPosition }: FieldCanvasProps) {
  const isEndzone = playSet === 'endzone'
  return (
    <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full" role="img" aria-label={step.label}>
      <FieldBackground showEndzone={isEndzone} />
      <PathPreviews paths={step.pathPreviews} />
      <PlayerTokens players={step.players} selectedPosition={selectedPosition} playCategory={playCategory} roster={roster} pathPreviews={step.pathPreviews} onSelectPosition={onSelectPosition} />
      <Disc step={step} onThrowComplete={onThrowComplete} />
      {highlightZone && (
        <rect
          x={highlightZone.x * FIELD_WIDTH}
          y={highlightZone.y * FIELD_HEIGHT}
          width={highlightZone.width * FIELD_WIDTH}
          height={highlightZone.height * FIELD_HEIGHT}
          fill="yellow"
          opacity={0.2}
        />
      )}
    </svg>
  )
}
