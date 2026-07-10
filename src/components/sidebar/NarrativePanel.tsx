import { NarrativeWithTooltips } from './NarrativeWithTooltips'
import type { Position } from '@/types/play'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
  roster: Record<Position, string>
}

export function NarrativePanel({ text, onHighlightZone, roster }: NarrativePanelProps) {
  if (!text) {
    return (
      <p className="text-lg leading-relaxed text-text-muted">
        You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
      </p>
    )
  }

  return <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} roster={roster} />
}
