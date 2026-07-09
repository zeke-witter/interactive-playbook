'use client'
import { useState } from 'react'
import type { Play, PlayStep } from '@/types/play'

export function usePlayStep(play: Play) {
  const [history, setHistory] = useState<string[]>([play.steps[0].id])
  const currentStepId = history[history.length - 1]
  const step = play.steps.find((s) => s.id === currentStepId) as PlayStep
  const linearIndex = play.steps.findIndex((s) => s.id === currentStepId)

  const isFirst = history.length === 1
  const isLast = step.isEnding === true || (!step.branches?.length && linearIndex === play.steps.length - 1)

  function next() {
    if (step.branches?.length) return
    const nextStep = play.steps[linearIndex + 1]
    if (nextStep) setHistory((h) => [...h, nextStep.id])
  }

  function goToStep(stepId: string) {
    setHistory((h) => [...h, stepId])
  }

  function prev() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }

  function reset() {
    setHistory([play.steps[0].id])
  }

  return { step, stepIndex: linearIndex, totalSteps: play.steps.length, isFirst, isLast, next, prev, goToStep, reset }
}
