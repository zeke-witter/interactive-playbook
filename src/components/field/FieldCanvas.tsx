'use client'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import { FieldBackground } from './FieldBackground'
import { ForceIndicator } from './ForceIndicator'
import { StallCounter } from './StallCounter'
import { PathPreviews } from './PathPreviews'
import { PlayerTokens } from './PlayerTokens'
import { DiscMarker } from './DiscMarker'
import { ThrowArc } from './ThrowArc'
import type { PlayStep, Position } from '@/types/play'

type FieldCanvasProps = {
  step: PlayStep
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  onThrowComplete?: () => void
}

export function FieldCanvas({ step, selectedPosition, playCategory, onThrowComplete }: FieldCanvasProps) {
  return (
    <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full" role="img" aria-label={step.label}>
      <FieldBackground />
      <ForceIndicator force={step.force} />
      <StallCounter startAt={step.stallCount} active={true} />
      <PathPreviews paths={step.pathPreviews} />
      <PlayerTokens players={step.players} selectedPosition={selectedPosition} playCategory={playCategory} />
      <DiscMarker players={step.players} />
      <ThrowArc key={step.id} throwArc={step.throw} players={step.players} onComplete={onThrowComplete} />
    </svg>
  )
}
