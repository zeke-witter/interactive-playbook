import type { Play, PlayStep, Position, Quiz, PlayBranch } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { QuizPanel } from './QuizPanel'
import { PlayPicker } from './PlayPicker'
import { PlayControls } from './PlayControls'

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
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
  roster: Record<Position, string>
}

export function Sidebar({
  play, step, stepIndex, selectedPosition, onPositionChange,
  isFirst, isLast, onPrev, onNext, onChooseBranch, quiz, quizPassed, onQuizAnswered, onHighlightZone, roster,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} roster={roster} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} roster={roster} />
      <NarrativePanel text={step.narrative[selectedPosition]} onHighlightZone={onHighlightZone} roster={roster} />
      {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} roster={roster} />}
      <PlayControls
        step={step}
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!!quiz && !quizPassed}
        onPrev={onPrev}
        onNext={onNext}
        onChooseBranch={onChooseBranch}
        className="hidden md:block"
      />
      <div className="hidden md:block">
        <PlayPicker currentPlay={play} />
      </div>
    </aside>
  )
}
