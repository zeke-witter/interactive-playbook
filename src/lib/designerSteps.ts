import type { DesignerStep, StepPath } from '@/types/designer'

export function getStepAtPath(root: DesignerStep[], path: StepPath): DesignerStep {
  let steps = root
  let step = steps[path[0]]
  for (let i = 1; i < path.length; i += 2) {
    const branchIndex = path[i]
    const stepIndex = path[i + 1]
    steps = step.branches![branchIndex].steps
    step = steps[stepIndex]
  }
  return step
}

export function getSequenceAtPath(root: DesignerStep[], path: StepPath): DesignerStep[] {
  if (path.length === 1) return root
  const parentStep = getStepAtPath(root, path.slice(0, -2))
  const branchIndex = path[path.length - 2]
  return parentStep.branches![branchIndex].steps
}

export function replaceStepAtPath(root: DesignerStep[], path: StepPath, updater: (step: DesignerStep) => DesignerStep): DesignerStep[] {
  const stepIndex = path[path.length - 1]
  return replaceSequenceAtPath(root, path, (seq) => seq.map((s, i) => (i === stepIndex ? updater(s) : s)))
}

export function replaceSequenceAtPath(root: DesignerStep[], path: StepPath, updater: (seq: DesignerStep[]) => DesignerStep[]): DesignerStep[] {
  if (path.length === 1) return updater(root)
  const parentPath = path.slice(0, -2)
  const branchIndex = path[path.length - 2]
  return replaceStepAtPath(root, parentPath, (step) => ({
    ...step,
    branches: step.branches!.map((b, i) => (i === branchIndex ? { ...b, steps: updater(b.steps) } : b)),
  }))
}
