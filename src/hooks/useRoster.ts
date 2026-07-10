'use client'
import { useState } from 'react'
import { MMP_CUTTER_NAMES, FMP_CUTTER_NAMES, MMP_HANDLER_NAMES, FMP_HANDLER_NAMES } from '@/data/names'
import type { Position } from '@/types/play'

function pickUnique(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateRoster(): Record<Position, string> {
  const fourThreeRatio = Math.random() < 0.5
  const mmpCutterCount = fourThreeRatio ? 2 : 1
  const fmpCutterCount = fourThreeRatio ? 2 : 3

  const cutterNames = [
    ...pickUnique(MMP_CUTTER_NAMES, mmpCutterCount),
    ...pickUnique(FMP_CUTTER_NAMES, fmpCutterCount),
  ].sort(() => Math.random() - 0.5)

  const handlerNames = [
    ...pickUnique(MMP_HANDLER_NAMES, 2),
    ...pickUnique(FMP_HANDLER_NAMES, 1),
  ].sort(() => Math.random() - 0.5)

  return {
    C1: cutterNames[0],
    C2: cutterNames[1],
    C3: cutterNames[2],
    C4: cutterNames[3],
    H1: handlerNames[0],
    H2: handlerNames[1],
    H3: handlerNames[2],
  }
}

export function useRoster(): Record<Position, string> {
  const [roster] = useState<Record<Position, string>>(() => generateRoster())
  return roster
}
