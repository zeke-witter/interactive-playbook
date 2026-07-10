'use client'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import { FieldBackground } from './FieldBackground'
import { StallCounter } from './StallCounter'
import { PathPreviews } from './PathPreviews'
import { PlayerTokens } from './PlayerTokens'
import { DiscMarker } from './DiscMarker'
import { ThrowArc } from './ThrowArc'
import type { Play, PlayStep, Position } from '@/types/play'

type FieldCanvasProps = {
  step: PlayStep
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  playSet: Play['set']
  roster: Record<Position, string>
  onThrowComplete?: () => void
  highlightZone?: { x: number; y: number; width: number; height: number } | null
}

export function FieldCanvas({ step, selectedPosition, playCategory, playSet, roster, onThrowComplete, highlightZone }: FieldCanvasProps) {
  const isEndzone = playSet === 'endzone'
  return (
    <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full" role="img" aria-label={step.label}>
      <FieldBackground showEndzone={isEndzone} />
      <StallCounter startAt={step.stallCount} active={true} />
      <PathPreviews paths={step.pathPreviews} />
      <PlayerTokens players={step.players} selectedPosition={selectedPosition} playCategory={playCategory} roster={roster} pathPreviews={step.pathPreviews} />
      <DiscMarker players={step.players} />
      <ThrowArc key={step.id} throwArc={step.throw} players={step.players} onComplete={onThrowComplete} />
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
