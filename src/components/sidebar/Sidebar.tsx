import type { Play, PlayStep, Position } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'

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
}

export function Sidebar({ play, step, stepIndex, selectedPosition, onPositionChange, isFirst, isLast, onPrev, onNext }: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} />
      <StepControls
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={onPrev}
        onNext={onNext}
      />
    </aside>
  )
}
