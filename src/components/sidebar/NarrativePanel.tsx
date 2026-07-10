import { NarrativeWithTooltips } from './NarrativeWithTooltips'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
}

export function NarrativePanel({ text, onHighlightZone }: NarrativePanelProps) {
  if (!text) {
    return (
      <p className="text-base leading-relaxed text-text-muted">
        You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
      </p>
    )
  }

  return <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} />
}
