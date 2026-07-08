import type { Play, PlayStep, Position, Quiz, PlayBranch } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'
import { QuizPanel } from './QuizPanel'
import { BranchChoice } from './BranchChoice'

type SidebarProps = {
  play: Play
  step: PlayStep
  stepIndex: number
  selectedPosition: Position
  onPositionChange: (p: Position) => void
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  onChooseBranch: (branch: PlayBranch) => void
  quiz: Quiz | undefined
  quizPassed: boolean
  onQuizAnswered: (correct: boolean) => void
}

export function Sidebar({
  play, step, stepIndex, selectedPosition, onPositionChange,
  isFirst, isLast, onPrev, onNext, onChooseBranch, quiz, quizPassed, onQuizAnswered,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} />
      {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} />}
      {step.branches?.length ? (
        <div className="flex flex-col gap-2">
          <button onClick={onPrev} disabled={isFirst} className="self-start px-3 py-1 rounded border disabled:opacity-30">
            ◀ Prev
          </button>
          <BranchChoice branches={step.branches} onChoose={onChooseBranch} />
        </div>
      ) : (
        <StepControls
          stepIndex={stepIndex}
          totalSteps={play.steps.length}
          isFirst={isFirst}
          isLast={isLast}
          nextDisabled={!!quiz && !quizPassed}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </aside>
  )
}
