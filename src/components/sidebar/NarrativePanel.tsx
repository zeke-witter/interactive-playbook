'use client'
import { NarrativeWithTooltips } from './NarrativeWithTooltips'
import type { Position } from '@/types/play'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
  roster: Record<Position, string>
}

// Narrative is authored/edited through the Designer (publish updates the play's
// `data`). The former dev-only inline editor + its /api route were retired in
// Phase 4 when authoring moved to DB server actions.
export function NarrativePanel({ text, onHighlightZone, roster }: NarrativePanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {!text ? (
        <p className="text-lg leading-relaxed text-text-muted">
          You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
        </p>
      ) : (
        <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} roster={roster} />
      )}
    </div>
  )
}
