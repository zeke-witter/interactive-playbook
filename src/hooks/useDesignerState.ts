'use client'
import { useState } from 'react'
import type { DesignerStep, DesignerMode } from '@/types/designer'
import type { PlayerPath, Position, Play } from '@/types/play'

const OFFENSE_ORDER: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']

function defaultStep(): DesignerStep {
  return {
    players: [
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.4 })),
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.5, isDefense: true })),
    ],
    pathPreviews: [],
  }
}

type InProgressPath = { playerIndex: number; points: { x: number; y: number }[] }

export function useDesignerState() {
  const [steps, setSteps] = useState<DesignerStep[]>([defaultStep()])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [modeState, setModeState] = useState<DesignerMode>('position')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [pathType, setPathType] = useState<PlayerPath['type']>('primary')
  const [inProgressPath, setInProgressPath] = useState<InProgressPath | null>(null)
  const [category, setCategory] = useState<Play['category']>('offense')
  const [set, setSet] = useState<Play['set']>('ho-stack')

  const currentStep = steps[currentStepIndex]

  function updateStep(index: number, updater: (step: DesignerStep) => DesignerStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? updater(s) : s)))
  }

  function setMode(newMode: DesignerMode) {
    setModeState(newMode)
    setSelectedIndex(null)
    setInProgressPath(null)
  }

  function selectToken(index: number | null) {
    setSelectedIndex(index)
  }

  function moveToken(index: number, x: number, y: number) {
    updateStep(currentStepIndex, (step) => ({
      ...step,
      players: step.players.map((p, i) => (i === index ? { ...p, x, y } : p)),
    }))
  }

  function startPath(index: number) {
    const player = currentStep.players[index]
    setInProgressPath({ playerIndex: index, points: [{ x: player.x, y: player.y }] })
  }

  function addWaypoint(x: number, y: number) {
    setInProgressPath((prev) => (prev ? { ...prev, points: [...prev.points, { x, y }] } : prev))
  }

  function finishPath() {
    if (!inProgressPath || inProgressPath.points.length < 2) {
      setInProgressPath(null)
      return
    }
    const player = currentStep.players[inProgressPath.playerIndex]
    const newPath: PlayerPath = { playerId: player.id, points: inProgressPath.points, type: pathType }
    updateStep(currentStepIndex, (step) => ({
      ...step,
      pathPreviews: [...step.pathPreviews.filter((p) => p.playerId !== player.id), newPath],
    }))
    setInProgressPath(null)
  }

  function cancelPath() {
    setInProgressPath(null)
  }

  function setDiscHolder(index: number) {
    updateStep(currentStepIndex, (step) => ({
      ...step,
      players: step.players.map((p, i) => ({ ...p, hasDisc: i === index })),
    }))
  }

  function setThrow(fromIndex: number, toIndex: number) {
    const from = currentStep.players[fromIndex]
    const to = currentStep.players[toIndex]
    updateStep(currentStepIndex, (step) => ({ ...step, throw: { from: from.id, to: to.id } }))
  }

  function addStep() {
    const duplicated: DesignerStep = {
      players: currentStep.players.map((p) => ({ ...p })),
      pathPreviews: [],
    }
    const newIndex = steps.length
    setSteps((prev) => [...prev, duplicated])
    setCurrentStepIndex(newIndex)
    setSelectedIndex(null)
  }

  function deleteStep(index: number) {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
    setCurrentStepIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev))
    setSelectedIndex(null)
  }

  function goToStep(index: number) {
    setCurrentStepIndex(index)
    setSelectedIndex(null)
  }

  return {
    steps,
    currentStepIndex,
    currentStep,
    mode: modeState,
    setMode,
    selectedIndex,
    selectToken,
    pathType,
    setPathType,
    inProgressPath,
    category,
    setCategory,
    set,
    setSet,
    moveToken,
    startPath,
    addWaypoint,
    finishPath,
    cancelPath,
    setDiscHolder,
    setThrow,
    addStep,
    deleteStep,
    goToStep,
  }
}
