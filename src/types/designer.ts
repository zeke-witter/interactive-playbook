import type { PlayerState, PlayerPath, ThrowArc, Position } from './play'

export type DesignerBranch = {
  label: string
  steps: DesignerStep[]
}

export type DesignerStep = {
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
  branches?: DesignerBranch[]
  narrative?: Partial<Record<Position, string>>
}

export type DesignerMode = 'position' | 'path' | 'throw' | 'select'

export type StepPath = number[]
