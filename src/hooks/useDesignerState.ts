'use client'
import { useEffect, useRef, useState } from 'react'
import type { DesignerStep, DesignerBranch, DesignerMode, StepPath } from '@/types/designer'
import type { PlayerPath, Position, Play } from '@/types/play'
import { getStepAtPath, getSequenceAtPath, replaceStepAtPath, replaceSequenceAtPath } from '@/lib/designerSteps'

type HistorySnapshot = {
  rootSteps: DesignerStep[]
  currentPath: StepPath
  category: Play['category']
  set: Play['set']
}

const OFFENSE_ORDER: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']
const AUTOSAVE_KEY = 'mousetrap-designer-autosave'

function defaultStep(): DesignerStep {
  return {
    players: [
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.4 })),
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.5, isDefense: true })),
    ],
    pathPreviews: [],
  }
}

function freshStepFrom(step: DesignerStep): DesignerStep {
  return { players: step.players.map((p) => ({ ...p })), pathPreviews: [] }
}

type InProgressPath = { playerIndex: number; points: { x: number; y: number }[] }

export function useDesignerState() {
  const [rootSteps, setRootSteps] = useState<DesignerStep[]>([defaultStep()])
  const [currentPath, setCurrentPath] = useState<StepPath>([0])
  const [modeState, setModeState] = useState<DesignerMode>('position')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [pathType, setPathType] = useState<PlayerPath['type']>('primary')
  const [inProgressPath, setInProgressPath] = useState<InProgressPath | null>(null)
  const [category, setCategoryState] = useState<Play['category']>('offense')
  const [set, setSetState] = useState<Play['set']>('ho-stack')
  const [hasHydrated, setHasHydrated] = useState(false)
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([])
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([])
  const dragSnapshotRef = useRef<HistorySnapshot | null>(null)

  const currentStep = getStepAtPath(rootSteps, currentPath)

  function currentSnapshot(): HistorySnapshot {
    return { rootSteps, currentPath, category, set }
  }

  function applySnapshot(snap: HistorySnapshot) {
    setRootSteps(snap.rootSteps)
    setCurrentPath(snap.currentPath)
    setCategoryState(snap.category)
    setSetState(snap.set)
    setSelectedIndex(null)
  }

  function pushHistory() {
    setUndoStack([...undoStack, currentSnapshot()])
    setRedoStack([])
  }

  function undo() {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack([...redoStack, currentSnapshot()])
    applySnapshot(last)
  }

  function redo() {
    if (redoStack.length === 0) return
    const last = redoStack[redoStack.length - 1]
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack([...undoStack, currentSnapshot()])
    applySnapshot(last)
  }

  // Position-mode token drags call moveToken on every pointermove — pushing
  // history on each call would make undo backtrack pixel-by-pixel. Instead
  // the pre-drag state is captured once here (on pointerdown) and only
  // pushed to the undo stack once the whole gesture completes (endDrag).
  function beginDrag() {
    dragSnapshotRef.current = currentSnapshot()
  }

  function endDrag() {
    if (dragSnapshotRef.current) {
      setUndoStack([...undoStack, dragSnapshotRef.current])
      setRedoStack([])
      dragSnapshotRef.current = null
    }
  }

  function cancelDrag() {
    if (dragSnapshotRef.current) {
      applySnapshot(dragSnapshotRef.current)
      dragSnapshotRef.current = null
    }
  }

  function setCategory(newCategory: Play['category']) {
    pushHistory()
    setCategoryState(newCategory)
  }

  function setSet(newSet: Play['set']) {
    pushHistory()
    setSetState(newSet)
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as { category?: Play['category']; set?: Play['set']; steps?: DesignerStep[] }
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setRootSteps(data.steps)
          if (data.category) setCategoryState(data.category)
          if (data.set) setSetState(data.set)
          setCurrentPath([0])
        }
      }
    } catch {
      // malformed or absent autosave data — ignore and keep defaults
    }
    setHasHydrated(true)
  }, [])

  // Guarded by hasHydrated so this effect's first run (which fires on mount
  // regardless of whether the restore effect above has applied its update yet)
  // doesn't immediately overwrite a just-restored draft with default state.
  useEffect(() => {
    if (!hasHydrated) return
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ category, set, steps: rootSteps }))
  }, [hasHydrated, rootSteps, category, set])

  function updateCurrentStep(updater: (step: DesignerStep) => DesignerStep) {
    setRootSteps((prev) => replaceStepAtPath(prev, currentPath, updater))
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
    updateCurrentStep((step) => ({
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
    pushHistory()
    const player = currentStep.players[inProgressPath.playerIndex]
    const newPath: PlayerPath = { playerId: player.id, points: inProgressPath.points, type: pathType }
    updateCurrentStep((step) => ({
      ...step,
      pathPreviews: [...step.pathPreviews.filter((p) => p.playerId !== player.id), newPath],
    }))
    setInProgressPath(null)
  }

  function cancelPath() {
    setInProgressPath(null)
  }

  function setDiscHolder(index: number) {
    pushHistory()
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p, i) => ({ ...p, hasDisc: i === index })),
    }))
  }

  function setThrow(fromIndex: number, toIndex: number) {
    pushHistory()
    const from = currentStep.players[fromIndex]
    const to = currentStep.players[toIndex]
    updateCurrentStep((step) => ({ ...step, throw: { from: from.id, to: to.id } }))
  }

  function clearDiscHolder() {
    pushHistory()
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p) => ({ ...p, hasDisc: false })),
      // A throw authored from this step names the holder being cleared as
      // its `from` — leaving it in place would let addStep transfer the
      // disc based on a throw whose source no longer holds it.
      throw: undefined,
    }))
  }

  function clearThrow() {
    pushHistory()
    updateCurrentStep((step) => ({ ...step, throw: undefined }))
  }

  function addStep() {
    pushHistory()
    let duplicated = freshStepFrom(currentStep)
    duplicated = {
      ...duplicated,
      players: duplicated.players.map((p) => {
        if (p.isDefense) return p
        const path = currentStep.pathPreviews.find((pp) => pp.playerId === p.id)
        if (!path) return p
        const last = path.points[path.points.length - 1]
        return { ...p, x: last.x, y: last.y }
      }),
    }
    if (currentStep.throw) {
      const { from, to } = currentStep.throw
      duplicated = {
        ...duplicated,
        players: duplicated.players.map((p) => {
          if (p.isDefense) return p
          if (p.id === to) return { ...p, hasDisc: true }
          if (p.id === from) return { ...p, hasDisc: false }
          return p
        }),
      }
    }
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const newIndex = sequence.length
    setRootSteps((prev) => replaceSequenceAtPath(prev, currentPath, (seq) => [...seq, duplicated]))
    setCurrentPath([...currentPath.slice(0, -1), newIndex])
    setSelectedIndex(null)
  }

  function deleteStep(path: StepPath) {
    const sequence = getSequenceAtPath(rootSteps, path)
    if (sequence.length <= 1) return
    pushHistory()
    const indexToDelete = path[path.length - 1]
    setRootSteps((prev) => replaceSequenceAtPath(prev, path, (seq) => seq.filter((_, i) => i !== indexToDelete)))
    setCurrentPath([0])
    setSelectedIndex(null)
  }

  function goToStep(path: StepPath) {
    setCurrentPath(path)
    setSelectedIndex(null)
  }

  function addBranch(label1: string, label2: string) {
    pushHistory()
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const currentIndex = currentPath[currentPath.length - 1]
    const remainder = sequence.slice(currentIndex + 1)
    const branch1Steps = remainder.length > 0 ? remainder : [freshStepFrom(currentStep)]
    const branch2Steps = [freshStepFrom(currentStep)]

    setRootSteps((prev) => {
      const truncated = replaceSequenceAtPath(prev, currentPath, (seq) => seq.slice(0, currentIndex + 1))
      return replaceStepAtPath(truncated, currentPath, (step) => ({
        ...step,
        branches: [
          { label: label1, steps: branch1Steps },
          { label: label2, steps: branch2Steps },
        ],
      }))
    })
    setCurrentPath([...currentPath, 1, 0])
    setSelectedIndex(null)
  }

  function addAnotherBranch(label: string) {
    pushHistory()
    const newBranch: DesignerBranch = { label, steps: [freshStepFrom(currentStep)] }
    const newBranches = [...(currentStep.branches ?? []), newBranch]
    const newBranchIndex = newBranches.length - 1
    setRootSteps((prev) => replaceStepAtPath(prev, currentPath, (step) => ({ ...step, branches: newBranches })))
    setCurrentPath([...currentPath, newBranchIndex, 0])
    setSelectedIndex(null)
  }

  function removeBranch(stepPath: StepPath, branchIndex: number) {
    const step = getStepAtPath(rootSteps, stepPath)
    if (!step.branches) return
    pushHistory()
    const newBranches = step.branches.filter((_, i) => i !== branchIndex)
    setRootSteps((prev) => replaceStepAtPath(prev, stepPath, (s) => ({
      ...s,
      branches: newBranches.length > 0 ? newBranches : undefined,
    })))
    setCurrentPath([0])
    setSelectedIndex(null)
  }

  function loadDraft(data: { category?: Play['category']; set?: Play['set']; steps?: unknown }): boolean {
    if (!Array.isArray(data.steps) || data.steps.length === 0) return false
    pushHistory()
    setRootSteps(data.steps as DesignerStep[])
    if (data.category) setCategoryState(data.category)
    if (data.set) setSetState(data.set)
    setCurrentPath([0])
    setSelectedIndex(null)
    setModeState('position')
    setInProgressPath(null)
    return true
  }

  return {
    steps: rootSteps,
    currentPath,
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
    clearDiscHolder,
    clearThrow,
    addStep,
    deleteStep,
    goToStep,
    addBranch,
    addAnotherBranch,
    removeBranch,
    loadDraft,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    beginDrag,
    endDrag,
    cancelDrag,
  }
}
