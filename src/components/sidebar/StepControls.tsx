type StepControlsProps = {
  stepperIndex: number
  stepperTotal: number
  showMoreIndicator: boolean
  isFirst: boolean
  isLast: boolean
  nextDisabled?: boolean
  onPrev: () => void
  onNext: () => void
}

export function StepControls({
  stepperIndex, stepperTotal, showMoreIndicator, isFirst, isLast, nextDisabled, onPrev, onNext,
}: StepControlsProps) {
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
      <div className="flex justify-center items-center gap-1">
        {Array.from({ length: stepperTotal }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === stepperIndex ? 'bg-accent' : 'bg-border'}`} />
        ))}
        {showMoreIndicator && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-text-muted ml-0.5"
            aria-label="More steps depending on your choice"
          >
            <title>More steps depending on your choice</title>
            <path d="M2 6H4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M4.5 6L8 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.6 1.4" />
            <path d="M4.5 6L8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.6 1.4" />
          </svg>
        )}
      </div>
    </div>
  )
}
