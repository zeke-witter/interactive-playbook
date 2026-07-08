'use client'
import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { FieldCanvas } from '@/components/field/FieldCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { usePlayStep } from '@/hooks/usePlayStep'
import { flood } from '@/data/plays/flood'
import { hoStackCenter } from '@/data/plays/ho-stack-center'
import type { Play, Position } from '@/types/play'

const PLAYS: Record<string, Play> = {
  flood,
  'ho-stack-center': hoStackCenter,
}

export default function PlayPage({ params }: { params: Promise<{ playId: string }> }) {
  const { playId } = use(params)
  const play = PLAYS[playId]
  if (!play) notFound()

  const [selectedPosition, setSelectedPosition] = useState<Position>('H1')
  const { step, stepIndex, isFirst, isLast, next, prev, goToStep } = usePlayStep(play)
  const [quizPassed, setQuizPassed] = useState(false)

  useEffect(() => {
    setQuizPassed(false)
  }, [stepIndex, selectedPosition])

  const quiz = step.quiz?.[selectedPosition]

  return (
    <main className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-[65%] h-full">
        <FieldCanvas step={step} selectedPosition={selectedPosition} playCategory={play.category} />
      </div>
      <Sidebar
        play={play}
        step={step}
        stepIndex={stepIndex}
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
      />
    </main>
  )
}
