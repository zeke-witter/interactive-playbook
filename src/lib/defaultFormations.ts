import type { Play, PlayerState } from '@/types/play'

// Canonical starting formations per set, used when a new play is created and
// when switching sets on a still-untouched play. Position ids appear twice
// (once per side) since every set needs both an offense and a defense side
// regardless of which one is the play's own team — `category` only affects
// rendering (color, dimming, labels), never which formation shape is used.
const DEFAULT_FORMATIONS: Record<Play['set'], PlayerState[]> = {
  'ho-stack': [
    { id: 'H1', x: 0.30, y: 0.82 }, { id: 'H2', x: 0.50, y: 0.86 }, { id: 'H3', x: 0.70, y: 0.82 },
    { id: 'C1', x: 0.10, y: 0.45 }, { id: 'C2', x: 0.37, y: 0.46 }, { id: 'C3', x: 0.63, y: 0.46 }, { id: 'C4', x: 0.90, y: 0.45 },
    { id: 'H1', x: 0.30, y: 0.72, isDefense: true }, { id: 'H2', x: 0.50, y: 0.76, isDefense: true }, { id: 'H3', x: 0.70, y: 0.72, isDefense: true },
    { id: 'C1', x: 0.14, y: 0.55, isDefense: true }, { id: 'C2', x: 0.40, y: 0.56, isDefense: true }, { id: 'C3', x: 0.60, y: 0.56, isDefense: true }, { id: 'C4', x: 0.86, y: 0.55, isDefense: true },
  ],
  'vert-stack': [
    { id: 'H1', x: 0.40, y: 0.82 }, { id: 'H2', x: 0.50, y: 0.88 }, { id: 'H3', x: 0.60, y: 0.82 },
    { id: 'C1', x: 0.50, y: 0.58 }, { id: 'C2', x: 0.50, y: 0.42 }, { id: 'C3', x: 0.50, y: 0.34 }, { id: 'C4', x: 0.50, y: 0.26 },
    { id: 'H1', x: 0.40, y: 0.72, isDefense: true }, { id: 'H2', x: 0.50, y: 0.78, isDefense: true }, { id: 'H3', x: 0.60, y: 0.72, isDefense: true },
    { id: 'C1', x: 0.58, y: 0.60, isDefense: true }, { id: 'C2', x: 0.42, y: 0.44, isDefense: true }, { id: 'C3', x: 0.58, y: 0.36, isDefense: true }, { id: 'C4', x: 0.42, y: 0.28, isDefense: true },
  ],
  flow: [
    // A looser, unstructured look for isolation/continuation plays: handlers
    // spread wide up front, cutters scattered at varying depths rather than
    // one rigid row or column.
    { id: 'H1', x: 0.25, y: 0.85 }, { id: 'H2', x: 0.50, y: 0.90 }, { id: 'H3', x: 0.75, y: 0.85 },
    { id: 'C1', x: 0.15, y: 0.50 }, { id: 'C2', x: 0.40, y: 0.58 }, { id: 'C3', x: 0.60, y: 0.38 }, { id: 'C4', x: 0.85, y: 0.50 },
    { id: 'H1', x: 0.25, y: 0.75, isDefense: true }, { id: 'H2', x: 0.50, y: 0.80, isDefense: true }, { id: 'H3', x: 0.75, y: 0.75, isDefense: true },
    { id: 'C1', x: 0.22, y: 0.60, isDefense: true }, { id: 'C2', x: 0.47, y: 0.68, isDefense: true }, { id: 'C3', x: 0.53, y: 0.48, isDefense: true }, { id: 'C4', x: 0.78, y: 0.60, isDefense: true },
  ],
  zone: [
    // Spread offense attacking a 2-3-2 zone shape: a front pair, a mid line
    // of three, a deep pair. Used for both offense- and defense-category
    // plays — category only changes which side reads as "own team".
    { id: 'H1', x: 0.20, y: 0.85 }, { id: 'H2', x: 0.50, y: 0.90 }, { id: 'H3', x: 0.80, y: 0.85 },
    { id: 'C1', x: 0.15, y: 0.55 }, { id: 'C2', x: 0.50, y: 0.60 }, { id: 'C3', x: 0.85, y: 0.55 }, { id: 'C4', x: 0.50, y: 0.30 },
    { id: 'H1', x: 0.45, y: 0.30, isDefense: true }, { id: 'H2', x: 0.55, y: 0.30, isDefense: true },
    { id: 'C1', x: 0.25, y: 0.42, isDefense: true }, { id: 'C2', x: 0.50, y: 0.40, isDefense: true }, { id: 'C3', x: 0.75, y: 0.42, isDefense: true },
    { id: 'H3', x: 0.30, y: 0.10, isDefense: true }, { id: 'C4', x: 0.70, y: 0.10, isDefense: true },
  ],
  endzone: [
    { id: 'H1', x: 0.25, y: 0.90 }, { id: 'H2', x: 0.50, y: 0.94 }, { id: 'H3', x: 0.75, y: 0.90 },
    { id: 'C1', x: 0.15, y: 0.72 }, { id: 'C2', x: 0.38, y: 0.76 }, { id: 'C3', x: 0.62, y: 0.76 }, { id: 'C4', x: 0.85, y: 0.72 },
    { id: 'H1', x: 0.25, y: 0.80, isDefense: true }, { id: 'H2', x: 0.50, y: 0.84, isDefense: true }, { id: 'H3', x: 0.75, y: 0.80, isDefense: true },
    { id: 'C1', x: 0.19, y: 0.62, isDefense: true }, { id: 'C2', x: 0.42, y: 0.66, isDefense: true }, { id: 'C3', x: 0.58, y: 0.66, isDefense: true }, { id: 'C4', x: 0.81, y: 0.62, isDefense: true },
  ],
}

export function defaultFormationFor(set: Play['set']): PlayerState[] {
  return DEFAULT_FORMATIONS[set].map((p) => ({ ...p }))
}
