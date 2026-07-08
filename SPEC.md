# Mousetrap Interactive Playbook — Spec & Implementation Plan

## Problem

Static PDF field diagrams don't convey motion or player-relative perspective. Many players struggle to understand their role from abstract diagrams. This app puts the learner in a specific position and lets them experience each play from that vantage point through animated, step-by-step flows.

---

## Design Decisions

| Question | Decision | Rationale |
|---|---|---|
| Field orientation | Fixed — always defend upward | Matches PDF diagrams; no confusion about which end |
| Defense on offense slides | Yes, show defenders (lighter opacity) | Force and spacing concepts require them |
| First play (MVP) | **Flood** | 5 clean steps, no branching, 7 positions — validates the whole interaction pattern cheaply |
| Terminology tooltips | Yes | Underlined jargon in sidebar → hover shows definition + highlights zone on field |
| Mobile | Desktop-first, mobile later | Split panel is the core UX; mobile needs a different layout |

---

## Layout

```
┌─────────────────────────────────────────┬──────────────────────┐
│                                         │  Mousetrap Plays     │
│         FIELD CANVAS (SVG)              │  ──────────────────  │
│                                         │  🎯 You are: [C3 ▾]  │
│  [Force indicator — shaded break zone]  │                      │
│                                         │  Flood — Step 2 of 5 │
│   ○C4    ○C3*   ○C2    ○C1             │  ──────────────────  │
│                                         │  As C3, you and C2   │
│         ╌╌╌╌→   ←╌╌╌╌                 │  are clearing upfield │
│                                         │  to the left rail.   │
│   ●H2    ○H1⊙   ○H3                   │  Make room for C1's  │
│           /                             │  cut across.         │
│                                         │                      │
│                                         │  [◀ Prev]  [Next ▶]  │
│ [ENDZONE]                               │  ○ ● ○ ○ ○           │
└─────────────────────────────────────────┴──────────────────────┘
```

- `*` = highlighted "you" token (white ring)
- `⊙` = disc
- `/` = force marker (diagonal line through H1's defender)
- `╌→` = dashed path preview (shown before animation plays)
- Shaded area = break zone

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Field rendering | SVG (inline React SVG) |
| Animation | Framer Motion |
| Play data | TypeScript const files in `/src/data/plays/` |
| State | React useState / useReducer (no external library for Phase 1) |

---

## Data Model

```typescript
type Position = 'H1' | 'H2' | 'H3' | 'C1' | 'C2' | 'C3' | 'C4'
type Force = 'forehand' | 'backhand' | 'none'
type PathType = 'primary' | 'secondary' | 'clear' | 'reset'

type PlayerState = {
  id: Position
  x: number        // normalized 0–1 (0 = left sideline, 1 = right sideline)
  y: number        // normalized 0–1 (0 = attacking endzone, 1 = own endzone)
  isDefense?: boolean
  hasDisc?: boolean
}

type PlayerPath = {
  playerId: Position
  points: Array<{ x: number; y: number }>
  type: PathType
}

type ThrowArc = {
  from: Position
  to: Position
}

type Quiz = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

type PlayStep = {
  id: string
  label: string                           // e.g. "Look 1 — Stalls 1–3"
  stallCount?: number
  force: Force
  players: PlayerState[]
  pathPreviews: PlayerPath[]              // Shown as dashed lines before animation
  throw?: ThrowArc                        // Animates after players settle
  narrative: Partial<Record<Position, string>>
  quiz?: Partial<Record<Position, Quiz>> // Phase 2
}

type Play = {
  id: string
  name: string
  category: 'offense' | 'defense'
  set: 'ho-stack' | 'vert-stack' | 'zone-o' | 'zone-d' | 'person-d' | 'endzone' | 'pull-play'
  description: string
  steps: PlayStep[]
}
```

---

## Route Structure

```
/                     → Play browser (list of plays by category/set)
/plays/[playId]       → Play viewer (field + sidebar)
```

---

## Component Tree

```
PlayPage
├── FieldCanvas
│   ├── FieldBackground      SVG: grass, lines, endzones, yard markers
│   ├── ForceIndicator       SVG: shaded break zone + "Force: Forehand" label
│   ├── PathPreviews         SVG: dashed lines, shown before step animates
│   ├── PlayerTokens         SVG: circles with labels; "you" gets a highlight ring
│   ├── DiscMarker           SVG: small white circle, moves with hasDisc player
│   └── ThrowArc             Framer Motion: animated arc when a throw happens
└── Sidebar
    ├── PositionSelector     Dropdown: "I am playing as…"
    ├── PlayHeader           Play name + step progress dots
    ├── NarrativePanel       Per-position text with tooltip-enabled jargon
    ├── QuizPanel            Phase 2: MCQ before step advances
    └── StepControls         Prev / Next buttons
```

---

## Interaction Flow (Phase 1 — Watch Mode)

1. Learner opens `/plays/flood`
2. Selects their position from the dropdown (defaults to H1)
3. Field renders Step 1: player positions + dashed path previews
4. Sidebar shows that position's narrative for Step 1
5. Learner clicks **Next** → players animate to their new positions
6. If the step includes a throw, the disc arc animates after players settle
7. Field resolves to the next step state; sidebar updates
8. Repeat until the final step, then offer "Play again" or back to browser

---

## Implementation Plan

### Phase 1 — MVP (Flood play, Watch Mode)

1. Scaffold project: `create-next-app` with TypeScript + Tailwind + App Router, install Framer Motion
2. Define TypeScript types in `/src/types/play.ts`
3. Build `<FieldBackground>` — static SVG field (grass, lines, endzones, sidelines)
4. Build `<PlayerToken>` — circle + label, "you" variant with highlight ring
5. Build `<ForceIndicator>` — shaded polygon + "Force: Forehand/Backhand" label
6. Build `<PathPreviews>` — dashed SVG polylines from `pathPreviews` data
7. Build `<ThrowArc>` — Framer Motion animated disc path between two players
8. Build `<FieldCanvas>` — composes the above, receives `PlayStep` + `selectedPosition`
9. Build `<PositionSelector>` — controlled dropdown
10. Build `<NarrativePanel>` — renders `step.narrative[selectedPosition]`
11. Build `<StepControls>` + step state management (index, prev/next)
12. Build `<Sidebar>` — composes selector, narrative, controls
13. Encode **Flood** play data in `/src/data/plays/flood.ts`
14. Build `/plays/[playId]/page.tsx` — wires FieldCanvas + Sidebar together
15. Build `/page.tsx` — minimal play browser listing available plays

### Phase 2 — Quiz Mode + Ho Stack

16. Build `<QuizPanel>` — MCQ with reveal, feedback, and explanation text
17. Add quiz gating: Next button disabled until correct answer selected
18. Encode Ho Stack center-field flow in `/src/data/plays/ho-stack-center.ts`
19. Add branching data model and branching UI (choice cards after a branching step)

### Phase 3 — Full Coverage + Polish

20. Encode remaining plays from playbook (Vert Stack, Endzone flows, Zone D, etc.)
21. Stall counter component (visible ticking count on field during relevant steps)
22. Terminology tooltip system (inline underlines in narrative → hover for definition + field highlight)
23. Progress tracking (localStorage: which plays/positions each player has completed)
24. Mobile layout

---

## Source Material

`Mousetrap Playbook.pdf` — 98 pages covering:
- Horizontal Stack (center field, force sideline, break sideline, look-by-look sequences)
- Vertical Stack (initiation, continuation, handler movement, poach/bracket handling)
- Endzone Offense (vert stack flows, Baby ISO, Cookies, Cookies and Cream)
- Offensive Set Plays (Flood, Reverse, Garlic, Box, Zipper, Windmill)
- Zone Offense (roles, sideline trap handling)
- Person Defense (the mark, handler D, cutter D)
- Zone Defense (3-person cup, 2-3-2, 2-4-1, bracket)
