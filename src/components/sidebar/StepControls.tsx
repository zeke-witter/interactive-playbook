type StepControlsProps = {
  stepIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  nextDisabled?: boolean
  onPrev: () => void
  onNext: () => void
}

export function StepControls({ stepIndex, totalSteps, isFirst, isLast, nextDisabled, onPrev, onNext }: StepControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <button onClick={onPrev} disabled={isFirst} className="min-h-11 flex items-center justify-center px-3 py-1 rounded-md border border-border bg-surface text-text hover:bg-surface-raised disabled:opacity-30">
          ◀ Prev
        </button>
        <button onClick={onNext} disabled={isLast || nextDisabled} className="min-h-11 flex items-center justify-center px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground font-medium hover:bg-accent-hover disabled:opacity-30 disabled:bg-surface disabled:border-border disabled:text-text-muted">
          Next ▶
        </button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === stepIndex ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>
    </div>
  )
}
