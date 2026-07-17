'use client'
import { useEffect, useState } from 'react'
import type { Position } from '@/types/play'
import type { RosterPool } from '@/types/roster'

// Also the no-pool fallback: a team with no names renders the raw tokens, which
// read fine in prose ("C1 cuts under to H2").
const PLACEHOLDER_ROSTER: Record<Position, string> = {
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  C1: 'C1',
  C2: 'C2',
  C3: 'C3',
  C4: 'C4',
}

const CUTTER_TOKENS = ['C1', 'C2', 'C3', 'C4'] as const
const HANDLER_TOKENS = ['H1', 'H2', 'H3'] as const

function shuffle(pool: string[]): string[] {
  return [...pool].sort(() => Math.random() - 0.5)
}

function poolHasNames(pool: RosterPool): boolean {
  const { cutters, handlers } = pool
  return cutters.mmp.length + cutters.fmp.length + handlers.mmp.length + handlers.fmp.length > 0
}

/** Draw `count` names aiming for `mmpTarget` MMP + the rest FMP (mixed teams).
 *  If a gender pool is short, backfill from the other so the line still fills. */
function pickMixed(mmp: string[], fmp: string[], count: number, mmpTarget: number): string[] {
  const m = shuffle(mmp)
  const f = shuffle(fmp)
  const fmpTarget = count - mmpTarget
  const picked = [...m.slice(0, mmpTarget), ...f.slice(0, fmpTarget)]
  if (picked.length < count) {
    const leftovers = shuffle([...m.slice(mmpTarget), ...f.slice(fmpTarget)])
    picked.push(...leftovers.slice(0, count - picked.length))
  }
  return shuffle(picked)
}

/** Draw `count` names from one merged pool (open/women teams — gender ignored). */
function pickSingle(pool: string[], count: number): string[] {
  return shuffle(pool).slice(0, count)
}

function generateRoster(pool: RosterPool): Record<Position, string> {
  let cutterNames: string[]
  let handlerNames: string[]

  if (pool.division === 'mixed') {
    // Same 4:3 gender ratio as the original Mousetrap roster: cutters are 2+2 or
    // 1+3 MMP:FMP; handlers 2 MMP + 1 FMP.
    const fourThree = Math.random() < 0.5
    cutterNames = pickMixed(pool.cutters.mmp, pool.cutters.fmp, 4, fourThree ? 2 : 1)
    handlerNames = pickMixed(pool.handlers.mmp, pool.handlers.fmp, 3, 2)
  } else {
    cutterNames = pickSingle([...pool.cutters.mmp, ...pool.cutters.fmp], 4)
    handlerNames = pickSingle([...pool.handlers.mmp, ...pool.handlers.fmp], 3)
  }

  // Any slot the pool couldn't fill keeps its token placeholder.
  const roster: Record<Position, string> = { ...PLACEHOLDER_ROSTER }
  CUTTER_TOKENS.forEach((t, i) => {
    if (cutterNames[i]) roster[t] = cutterNames[i]
  })
  HANDLER_TOKENS.forEach((t, i) => {
    if (handlerNames[i]) roster[t] = handlerNames[i]
  })
  return roster
}

/**
 * Assigns display names to the seven position tokens for a Viewer load. Draws
 * from the play's team roster `pool` (randomized each load, so names aren't
 * stable between sessions — intentional). With no pool (personal play, or a team
 * that hasn't added names) it returns the raw tokens.
 */
export function useRoster(pool?: RosterPool | null): Record<Position, string> {
  const [roster, setRoster] = useState<Record<Position, string>>(PLACEHOLDER_ROSTER)

  useEffect(() => {
    setRoster(pool && poolHasNames(pool) ? generateRoster(pool) : PLACEHOLDER_ROSTER)
  }, [pool])

  return roster
}
