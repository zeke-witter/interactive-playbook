import type { PlayerState, PlayerPath, ThrowArc, Position, Quiz } from './play'

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
  label?: string
  // Not authorable in the Designer UI yet — carried through opaquely so
  // loading an already-published play with quizzes and republishing it
  // doesn't silently drop them.
  quiz?: Partial<Record<Position, Quiz>>
}

export type DesignerMode = 'position' | 'possession' | 'path' | 'throw' | 'select'

export type StepPath = number[]
