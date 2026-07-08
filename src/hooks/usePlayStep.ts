'use client'
import { useState } from 'react'
import type { Play, PlayStep } from '@/types/play'

export function usePlayStep(play: Play) {
  const [stepIndex, setStepIndex] = useState(0)

  const step: PlayStep = play.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === play.steps.length - 1

  function next() {
    setStepIndex((i) => Math.min(i + 1, play.steps.length - 1))
  }

  function prev() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  function reset() {
    setStepIndex(0)
  }

  return { step, stepIndex, totalSteps: play.steps.length, isFirst, isLast, next, prev, reset }
}
