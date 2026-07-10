export function PlayHeader({ name, stepLabel, stepIndex, totalSteps }: { name: string; stepLabel: string; stepIndex: number; totalSteps: number }) {
  return (
    <div>
      <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Mousetrap Plays</h1>
      <h2 className="text-sm text-text-muted">{name} — {stepLabel} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
