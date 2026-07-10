import { substituteNames } from '@/lib/names'
import type { Position } from '@/types/play'

export function PlayHeader({
  name, stepLabel, stepIndex, totalSteps, roster,
}: {
  name: string; stepLabel: string; stepIndex: number; totalSteps: number; roster: Record<Position, string>
}) {
  return (
    <div>
      <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Mousetrap Plays</h1>
      <h2 className="text-sm text-text-muted">{name} — {substituteNames(stepLabel, roster)} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
