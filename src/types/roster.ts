/**
 * Per-team roster names. A team's players are pooled by role (cutter/handler)
 * and — for `mixed` teams only — tagged by gender so the Viewer can build a
 * gender-balanced line. `open`/`women` teams draw from one pool per role and the
 * gender split is ignored. See `useRoster` (sampling) and `roster_name` (DB).
 */

export type Division = 'open' | 'women' | 'mixed'

export type GenderedPool = { mmp: string[]; fmp: string[] }

export type RosterPool = {
  division: Division
  cutters: GenderedPool
  handlers: GenderedPool
}
