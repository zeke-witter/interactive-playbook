import type { PlayerState, PlayerPath, ThrowArc } from './play'

export type DesignerBranch = {
  label: string
  steps: DesignerStep[]
}

export type DesignerStep = {
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
  branches?: DesignerBranch[]
}

export type DesignerMode = 'position' | 'path' | 'throw'

export type StepPath = number[]
