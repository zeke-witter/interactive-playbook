export function PlayHeader({ name, stepLabel, stepIndex, totalSteps }: { name: string; stepLabel: string; stepIndex: number; totalSteps: number }) {
  return (
    <div>
      <h1 className="text-lg font-bold">Mousetrap Plays</h1>
      <h2 className="text-sm text-gray-500">{name} — {stepLabel} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
