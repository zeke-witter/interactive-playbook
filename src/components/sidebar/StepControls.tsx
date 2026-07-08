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
        <button onClick={onPrev} disabled={isFirst} className="px-3 py-1 rounded border disabled:opacity-30">
          ◀ Prev
        </button>
        <button onClick={onNext} disabled={isLast || nextDisabled} className="px-3 py-1 rounded border disabled:opacity-30">
          Next ▶
        </button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === stepIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
        ))}
      </div>
    </div>
  )
}
