import type { Play, PlayStep, PlayBranch } from '@/types/play'
import type { DesignerStep } from '@/types/designer'
import { sanitizeSlug } from './slug'

// Rebuilds the Designer's nested step/branch tree from a published Play's
// flat steps array. Each branch's own steps are stored contiguously in the
// flat array right after their fork point (the established authoring
// convention this whole app relies on), so walking forward from a branch's
// `nextStepId` and stopping at the next fork (or an explicit `isEnding`)
// correctly reconstructs that branch's own sequence without wandering into
// a sibling branch's steps.
export function playToDesignerSteps(play: Play): DesignerStep[] {
  const indexById = new Map(play.steps.map((s, i) => [s.id, i]))

  function walk(startIndex: number): DesignerStep[] {
    const result: DesignerStep[] = []
    let i = startIndex
    while (i < play.steps.length) {
      const step = play.steps[i]
      const designerStep: DesignerStep = {
        players: step.players.map((p) => ({ ...p })),
        pathPreviews: step.pathPreviews.map((pp) => ({ ...pp, points: pp.points.map((pt) => ({ ...pt })) })),
        narrative: { ...step.narrative },
        label: step.label,
      }
      if (step.throw) designerStep.throw = { ...step.throw }
      if (step.quiz) designerStep.quiz = step.quiz

      if (step.branches && step.branches.length > 0) {
        designerStep.branches = step.branches.map((branch) => ({
          label: branch.label,
          steps: walk(indexById.get(branch.nextStepId)!),
        }))
        result.push(designerStep)
        break
      }

      result.push(designerStep)
      if (step.isEnding) break
      i++
    }
    return result
  }

  return walk(0)
}

// Flattens the Designer's nested tree back into a Play's flat steps array,
// deriving each step's id from its position + label (rather than requiring
// the Designer to track stable ids) and deriving each branch's id from its
// label. `isEnding` is set on every branch's own last step except whichever
// one happens to land at the very end of the whole array, matching the
// existing hand-written convention exactly.
export function designerStepsToPlaySteps(designerSteps: DesignerStep[], playSlug: string): PlayStep[] {
  const out: PlayStep[] = []
  const leafEndIndices: number[] = []
  let counter = 1

  function walk(list: DesignerStep[]): void {
    list.forEach((ds, idx) => {
      const label = ds.label?.trim() || `Step ${counter}`
      const id = `${playSlug}-${counter}-${sanitizeSlug(label)}`
      counter++

      const playStep: PlayStep = {
        id,
        label,
        force: 'none',
        players: ds.players.map((p) => ({ ...p })),
        pathPreviews: ds.pathPreviews.map((pp) => ({ ...pp, points: pp.points.map((pt) => ({ ...pt })) })),
        narrative: { ...ds.narrative },
      }
      if (ds.throw) playStep.throw = { ...ds.throw }
      if (ds.quiz) playStep.quiz = ds.quiz

      out.push(playStep)
      const hasBranches = !!ds.branches?.length

      if (hasBranches) {
        playStep.branches = ds.branches!.map((branch): PlayBranch => {
          const startIndex = out.length
          walk(branch.steps)
          return {
            id: sanitizeSlug(branch.label) || `branch-${startIndex}`,
            label: branch.label,
            nextStepId: out[startIndex].id,
          }
        })
      } else if (idx === list.length - 1) {
        leafEndIndices.push(out.length - 1)
      }
    })
  }

  walk(designerSteps)

  const trueLastIndex = out.length - 1
  for (const i of leafEndIndices) {
    if (i !== trueLastIndex) out[i].isEnding = true
  }

  return out
}

export function buildPlay(params: {
  id: string
  name: string
  category: Play['category']
  set: Play['set']
  description: string
  steps: DesignerStep[]
}): Play {
  return {
    id: params.id,
    name: params.name,
    category: params.category,
    set: params.set,
    description: params.description,
    steps: designerStepsToPlaySteps(params.steps, params.id),
  }
}
