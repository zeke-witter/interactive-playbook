'use client'
import { useEffect, useState } from 'react'
import { MMP_CUTTER_NAMES, FMP_CUTTER_NAMES, MMP_HANDLER_NAMES, FMP_HANDLER_NAMES } from '@/data/names'
import type { Position } from '@/types/play'

const PLACEHOLDER_ROSTER: Record<Position, string> = {
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  C1: 'C1',
  C2: 'C2',
  C3: 'C3',
  C4: 'C4',
}

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
  const [roster, setRoster] = useState<Record<Position, string>>(PLACEHOLDER_ROSTER)

  useEffect(() => {
    setRoster(generateRoster())
  }, [])

  return roster
}
