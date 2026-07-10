import type { PlayerState, PlayerPath, ThrowArc } from './play'

export type DesignerStep = {
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
}

export type DesignerMode = 'position' | 'path' | 'throw'
