import type { Position } from '@/types/play'

export const GENERIC_DEFENDER_LABELS: Record<Position, string> = {
  C1: 'D1',
  C2: 'D2',
  C3: 'D3',
  C4: 'D4',
  H1: 'D5',
  H2: 'D6',
  H3: 'D7',
}

const POSITION_PATTERN = /\b(C[1-4]|H[1-3])\b/g

export function substituteNames(text: string, roster: Record<Position, string>): string {
  return text.replace(POSITION_PATTERN, (match) => roster[match as Position] ?? match)
}
