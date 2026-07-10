import type { PlayStep, PlayBranch } from '@/types/play'
import { StepControls } from './StepControls'
import { BranchChoice } from './BranchChoice'

type PlayControlsProps = {
  step: PlayStep
  stepIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  nextDisabled: boolean
  onPrev: () => void
  onNext: () => void
  onChooseBranch: (branch: PlayBranch) => void
  className?: string
}

export function PlayControls({
  step, stepIndex, totalSteps, isFirst, isLast, nextDisabled, onPrev, onNext, onChooseBranch, className,
}: PlayControlsProps) {
  return (
    <div className={className}>
      {step.branches?.length ? (
        <div className="flex flex-col gap-2">
          <button onClick={onPrev} disabled={isFirst} className="self-start px-3 py-1 rounded-md border border-border bg-surface text-text hover:bg-surface-raised disabled:opacity-30">
            ◀ Prev
          </button>
          <BranchChoice branches={step.branches} onChoose={onChooseBranch} />
        </div>
      ) : (
        <StepControls
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          isFirst={isFirst}
          isLast={isLast}
          nextDisabled={nextDisabled}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  )
}
