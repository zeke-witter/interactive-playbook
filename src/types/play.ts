export type Position = 'H1' | 'H2' | 'H3' | 'C1' | 'C2' | 'C3' | 'C4'
export type Force = 'forehand' | 'backhand' | 'none'
export type PathType = 'primary' | 'secondary' | 'clear' | 'reset'

export type PlayerState = {
  id: Position
  x: number // normalized 0-1 (0 = left sideline, 1 = right sideline)
  y: number // normalized 0-1 (0 = attacking endzone, 1 = own endzone)
  isDefense?: boolean
  hasDisc?: boolean
}

export type PlayerPath = {
  playerId: Position
  points: Array<{ x: number; y: number }>
  type: PathType
}

export type ThrowArc = {
  from: Position
  to: Position
}

export type PlayBranch = {
  id: string
  label: string // e.g. "C1 gets the under look" vs "C1 is covered"
  nextStepId: string
}

export type Quiz = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type PlayStep = {
  id: string
  label: string
  stallCount?: number
  force: Force
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
  narrative: Partial<Record<Position, string>>
  quiz?: Partial<Record<Position, Quiz>>
  branches?: PlayBranch[]
}

export type Play = {
  id: string
  name: string
  category: 'offense' | 'defense'
  set: 'ho-stack' | 'vert-stack' | 'zone-o' | 'zone-d' | 'person-d' | 'endzone' | 'pull-play'
  description: string
  steps: PlayStep[]
}
