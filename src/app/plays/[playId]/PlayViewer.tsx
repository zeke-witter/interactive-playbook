'use client'
import { useEffect, useState } from 'react'
import { FieldCanvas } from '@/components/field/FieldCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { usePlayStep } from '@/hooks/usePlayStep'
import { useProgress } from '@/hooks/useProgress'
import { useRoster } from '@/hooks/useRoster'
import type { Play, Position } from '@/types/play'

/**
 * Client shell for the Play Viewer. The play (and the published-play list that
 * feeds the picker) are fetched on the server and passed in as props; all the
 * interactive hooks (step nav, roster, progress) live here.
 */
export function PlayViewer({ play, plays, basePath }: { play: Play; plays: Play[]; basePath?: string }) {
  const [selectedPosition, setSelectedPosition] = useState<Position>('H1')
  const { step, stepIndex, stepperIndex, stepperTotal, showMoreIndicator, isFirst, isLast, next, prev, goToStep } = usePlayStep(play)
  const { markComplete } = useProgress()
  const roster = useRoster()
  const [quizPassed, setQuizPassed] = useState(false)
  const [highlightZone, setHighlightZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  useEffect(() => {
    setQuizPassed(false)
  }, [stepIndex, selectedPosition])

  useEffect(() => {
    if (isLast) markComplete(play.id, selectedPosition)
  }, [isLast, play.id, selectedPosition, markComplete])

  const quiz = step.quiz?.[selectedPosition]

  return (
    <main className="flex flex-col md:flex-row h-screen overflow-hidden">
      <div className="w-full md:w-[65%] aspect-[5/6] md:aspect-auto shrink-0 md:h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <FieldCanvas
            step={step}
            selectedPosition={selectedPosition}
            playCategory={play.category}
            playSet={play.set}
            roster={roster}
            highlightZone={highlightZone}
            onSelectPosition={setSelectedPosition}
          />
        </div>
      </div>
      <Sidebar
        play={play}
        plays={plays}
        basePath={basePath}
        step={step}
        roster={roster}
        stepIndex={stepIndex}
        stepperIndex={stepperIndex}
        stepperTotal={stepperTotal}
        showMoreIndicator={showMoreIndicator}
        selectedPosition={selectedPosition}
        onPositionChange={setSelectedPosition}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={prev}
        onNext={next}
        onChooseBranch={(branch) => goToStep(branch.nextStepId)}
        quiz={quiz}
        quizPassed={quizPassed}
        onQuizAnswered={(correct) => correct && setQuizPassed(true)}
        onHighlightZone={setHighlightZone}
      />
    </main>
  )
}
