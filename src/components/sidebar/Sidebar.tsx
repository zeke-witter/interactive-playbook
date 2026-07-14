import type { Play, PlayStep, Position, Quiz, PlayBranch } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { QuizPanel } from './QuizPanel'
import { PlayPicker } from './PlayPicker'
import { PlayControls } from './PlayControls'
import { PickerDrawer } from './PickerDrawer'

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
    <aside className="w-full md:w-[35%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-border">
      <div className="flex-none p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} roster={roster} />
          <PickerDrawer currentPlay={play} />
        </div>
        <PositionSelector value={selectedPosition} onChange={onPositionChange} roster={roster} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border-t border-b border-border px-4 py-4 flex flex-col gap-4">
        <NarrativePanel
          text={step.narrative[selectedPosition]}
          onHighlightZone={onHighlightZone}
          roster={roster}
          playId={play.id}
          stepId={step.id}
          position={selectedPosition}
        />
        {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} roster={roster} />}
      </div>

      <div className="flex-none p-4">
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
          roster={roster}
        />
      </div>

      <div className="hidden md:block flex-none max-h-60 overflow-y-auto border-t border-border p-4">
        <PlayPicker currentPlay={play} />
      </div>
    </aside>
  )
}
