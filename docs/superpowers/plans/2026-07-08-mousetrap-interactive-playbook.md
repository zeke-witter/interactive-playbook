# Mousetrap Interactive Playbook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Mousetrap interactive playbook app described in `SPEC.md` — an animated, position-centric play viewer, covering all three phases (MVP Watch Mode, Quiz Mode, full play coverage + polish).

**Architecture:** A Next.js App Router site renders an SVG field composed of small presentational components (background, tokens, paths, force indicator, throw animation via Framer Motion). A step hook drives both the field and the sidebar from declarative TypeScript play-data files. Phase 2 extends the step hook from a linear index into a branching step graph.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, inline SVG, Framer Motion, React `useState` (no external state library).

## Global Constraints

- No automated tests of any kind (unit/integration/e2e) — hobby project, verify manually via the dev server. Do not add test files or test dependencies.
- Field orientation is fixed: always defend upward, matching the PDF diagrams. Never rotate or mirror the field.
- Defenders are always rendered; the team opposite `play.category` is dimmed (lighter opacity).
- Desktop-first layout (field ~65% left, sidebar ~35% right); mobile is explicitly deferred to Phase 3 Task 24.
- Play data lives in `/src/data/plays/`, one TypeScript file per play, typed against `/src/types/play.ts`.
- Position labels exactly: H1/H2/H3 (handlers), C1/C2/C3/C4 (cutters). Blue = offense, red = defense, white ring = "you."
- Coordinate system: normalized 0–1 on both axes. `x`: 0 = left sideline, 1 = right sideline. `y`: 0 = attacking-endzone back line, 1 = own-endzone back line. Defined precisely in Task 3.
- Source material is `Mousetrap Playbook.pdf` (98 pages) at the repo root. Play data must cite the PDF page(s) it was drawn from in the `description` field.

---

## Phase 1 — MVP (Flood play, Watch Mode)

### Task 1: Scaffold the Next.js project

**Files:**
- Create: entire Next.js project structure at repo root (via `create-next-app`)
- Modify: none (SPEC.md, the PDF, and `.claude/` are left alone)

**Interfaces:**
- Produces: a running `npm run dev` dev server on `localhost:3000`, `src/app/page.tsx` (default Next.js starter page), `tsconfig.json` with `@/*` → `src/*` alias, Tailwind wired into `src/app/globals.css`, `framer-motion` in `package.json` dependencies.

- [ ] **Step 1: Run create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

Answer any interactive prompts by accepting the defaults implied by the flags above.

- [ ] **Step 2: Install Framer Motion**

```bash
npm install framer-motion
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000` — confirm the default Next.js starter page loads with no console errors. Stop the server (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with TypeScript, Tailwind, Framer Motion"
```

---

### Task 2: Define the play data types

**Files:**
- Create: `src/types/play.ts`

**Interfaces:**
- Produces: `Position`, `Force`, `PathType`, `PlayerState`, `PlayerPath`, `ThrowArc`, `Quiz`, `PlayStep`, `Play` — every later task imports from this file.

- [ ] **Step 1: Write the types**

```typescript
// src/types/play.ts
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
}

export type Play = {
  id: string
  name: string
  category: 'offense' | 'defense'
  set: 'ho-stack' | 'vert-stack' | 'zone-o' | 'zone-d' | 'person-d' | 'endzone' | 'pull-play'
  description: string
  steps: PlayStep[]
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Expected: no errors (this is a compiler check, not a test suite — fine to keep per the no-testing constraint).

- [ ] **Step 3: Commit**

```bash
git add src/types/play.ts
git commit -m "feat: add play data type definitions"
```

---

### Task 3: Field constants + FieldBackground + preview route

**Files:**
- Create: `src/lib/field.ts`
- Create: `src/components/field/FieldBackground.tsx`
- Create: `src/app/dev/field-preview/page.tsx` (temporary scratch route, deleted in Task 8)

**Interfaces:**
- Produces: `FIELD_WIDTH`, `FIELD_HEIGHT`, `ENDZONE_DEPTH`, `toPixel(x, y)` — every field component (Tasks 3–8) consumes these. `<FieldBackground />` — no props.

- [ ] **Step 1: Write the field constants**

```typescript
// src/lib/field.ts
export const FIELD_WIDTH = 100
export const FIELD_HEIGHT = 120
export const ENDZONE_DEPTH = 20

export function toPixel(x: number, y: number) {
  return { px: x * FIELD_WIDTH, py: y * FIELD_HEIGHT }
}
```

- [ ] **Step 2: Write FieldBackground**

```tsx
// src/components/field/FieldBackground.tsx
import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_DEPTH } from '@/lib/field'

export function FieldBackground() {
  const fieldTop = ENDZONE_DEPTH
  const fieldBottom = FIELD_HEIGHT - ENDZONE_DEPTH

  return (
    <g>
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#2f7d3c" />
      <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
      <rect x={0} y={fieldBottom} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
      <line x1={0} y1={fieldTop} x2={FIELD_WIDTH} y2={fieldTop} stroke="white" strokeWidth={0.5} />
      <line x1={0} y1={fieldBottom} x2={FIELD_WIDTH} y2={fieldBottom} stroke="white" strokeWidth={0.5} />
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="none" stroke="white" strokeWidth={0.5} />
      <text x={FIELD_WIDTH / 2} y={fieldBottom + ENDZONE_DEPTH / 2} fill="white" fontSize={4} textAnchor="middle" opacity={0.6}>
        ENDZONE
      </text>
    </g>
  )
}
```

- [ ] **Step 3: Write the field preview scratch route**

This route exists only so Tasks 3–7 have somewhere to visually check each new SVG piece before `FieldCanvas` wires them together for real in Task 8. It is deleted at the start of Task 8.

```tsx
// src/app/dev/field-preview/page.tsx
import { FieldBackground } from '@/components/field/FieldBackground'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'

export default function FieldPreviewPage() {
  return (
    <div className="p-8 bg-gray-900 min-h-screen flex items-center justify-center">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} width={400} height={480} className="border border-white">
        <FieldBackground />
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/dev/field-preview` — confirm a green field with darker end zone bands top and bottom, a white border, and an "ENDZONE" label in the bottom band.

- [ ] **Step 5: Commit**

```bash
git add src/lib/field.ts src/components/field/FieldBackground.tsx src/app/dev/field-preview/page.tsx
git commit -m "feat: add field constants and FieldBackground with preview route"
```

---

### Task 4: PlayerToken

**Files:**
- Create: `src/components/field/PlayerToken.tsx`
- Modify: `src/app/dev/field-preview/page.tsx`

**Interfaces:**
- Consumes: `toPixel` from `@/lib/field`, `PlayerState` from `@/types/play`.
- Produces: `<PlayerToken player isYou dimmed />` — consumed by `PlayerTokens` in Task 8.

- [ ] **Step 1: Write PlayerToken**

Uses `motion.g` with an `x`/`y` transform so that when the parent re-renders with new coordinates (step changes later in Task 14), the token glides to its new position instead of snapping.

```tsx
// src/components/field/PlayerToken.tsx
'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

type PlayerTokenProps = {
  player: PlayerState
  isYou: boolean
  dimmed: boolean
}

export function PlayerToken({ player, isYou, dimmed }: PlayerTokenProps) {
  const { px, py } = toPixel(player.x, player.y)
  const fill = player.isDefense ? '#dc2626' : '#2563eb'

  return (
    <motion.g animate={{ x: px, y: py, opacity: dimmed ? 0.4 : 1 }} transition={{ duration: 0.6, ease: 'easeInOut' }}>
      <circle r={3.2} fill={fill} />
      {isYou && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {player.id}
      </text>
    </motion.g>
  )
}
```

- [ ] **Step 2: Add sample tokens to the preview route**

```tsx
// src/app/dev/field-preview/page.tsx
import { FieldBackground } from '@/components/field/FieldBackground'
import { PlayerToken } from '@/components/field/PlayerToken'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import type { PlayerState } from '@/types/play'

const SAMPLE_PLAYERS: PlayerState[] = [
  { id: 'H1', x: 0.5, y: 0.65, hasDisc: true },
  { id: 'C3', x: 0.15, y: 0.35 },
  { id: 'C3', x: 0.18, y: 0.4, isDefense: true },
]

export default function FieldPreviewPage() {
  return (
    <div className="p-8 bg-gray-900 min-h-screen flex items-center justify-center">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} width={400} height={480} className="border border-white">
        <FieldBackground />
        {SAMPLE_PLAYERS.map((p, i) => (
          <PlayerToken key={i} player={p} isYou={p.id === 'H1'} dimmed={!!p.isDefense} />
        ))}
      </svg>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Reload `http://localhost:3000/dev/field-preview` — confirm a blue "H1" token with a white ring (you), a blue "C3" token with no ring, and a dimmer red "C3" token nearby (its defender).

- [ ] **Step 4: Commit**

```bash
git add src/components/field/PlayerToken.tsx src/app/dev/field-preview/page.tsx
git commit -m "feat: add PlayerToken with motion-based position transitions"
```

---

### Task 5: ForceIndicator

**Files:**
- Create: `src/components/field/ForceIndicator.tsx`
- Modify: `src/app/dev/field-preview/page.tsx`

**Interfaces:**
- Consumes: `Force` from `@/types/play`, field constants from `@/lib/field`.
- Produces: `<ForceIndicator force />` — consumed by `FieldCanvas` in Task 8.

- [ ] **Step 1: Write ForceIndicator**

```tsx
// src/components/field/ForceIndicator.tsx
import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_DEPTH } from '@/lib/field'
import type { Force } from '@/types/play'

export function ForceIndicator({ force }: { force: Force }) {
  if (force === 'none') return null

  const shadeWidth = FIELD_WIDTH / 2
  const shadeX = force === 'forehand' ? 0 : shadeWidth
  const label = force === 'forehand' ? 'Force: Forehand' : 'Force: Backhand'

  return (
    <g>
      <rect x={shadeX} y={ENDZONE_DEPTH} width={shadeWidth} height={FIELD_HEIGHT - 2 * ENDZONE_DEPTH} fill="black" opacity={0.15} />
      <text x={FIELD_WIDTH / 2} y={ENDZONE_DEPTH - 4} fill="white" fontSize={3.5} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}
```

- [ ] **Step 2: Add it to the preview route**

Add `import { ForceIndicator } from '@/components/field/ForceIndicator'` and render `<ForceIndicator force="forehand" />` inside the `<svg>`, after `<FieldBackground />` and before the player tokens.

- [ ] **Step 3: Manual verification**

Reload the preview route — confirm the left half of the field is shaded slightly darker with a "Force: Forehand" label near the top.

- [ ] **Step 4: Commit**

```bash
git add src/components/field/ForceIndicator.tsx src/app/dev/field-preview/page.tsx
git commit -m "feat: add ForceIndicator"
```

---

### Task 6: PathPreviews

**Files:**
- Create: `src/components/field/PathPreviews.tsx`
- Modify: `src/app/dev/field-preview/page.tsx`

**Interfaces:**
- Consumes: `PlayerPath` from `@/types/play`, `toPixel` from `@/lib/field`.
- Produces: `<PathPreviews paths />` — consumed by `FieldCanvas` in Task 8.

- [ ] **Step 1: Write PathPreviews**

```tsx
// src/components/field/PathPreviews.tsx
import { toPixel } from '@/lib/field'
import type { PlayerPath } from '@/types/play'

const PATH_COLOR: Record<PlayerPath['type'], string> = {
  primary: '#fbbf24',
  secondary: '#93c5fd',
  clear: '#a3a3a3',
  reset: '#f472b6',
}

export function PathPreviews({ paths }: { paths: PlayerPath[] }) {
  return (
    <g>
      {paths.map((path, i) => {
        const pixelPoints = path.points.map((pt) => {
          const { px, py } = toPixel(pt.x, pt.y)
          return `${px},${py}`
        }).join(' ')

        return (
          <polyline
            key={`${path.playerId}-${i}`}
            points={pixelPoints}
            fill="none"
            stroke={PATH_COLOR[path.type]}
            strokeWidth={0.6}
            strokeDasharray="2,1.5"
          />
        )
      })}
    </g>
  )
}
```

- [ ] **Step 2: Add it to the preview route**

Add a sample path and render `<PathPreviews paths={SAMPLE_PATHS} />` before the player tokens:

```tsx
const SAMPLE_PATHS = [
  { playerId: 'C3' as const, points: [{ x: 0.15, y: 0.35 }, { x: 0.4, y: 0.5 }], type: 'primary' as const },
]
```

- [ ] **Step 3: Manual verification**

Reload the preview route — confirm a dashed amber line running from C3's position toward the middle of the field.

- [ ] **Step 4: Commit**

```bash
git add src/components/field/PathPreviews.tsx src/app/dev/field-preview/page.tsx
git commit -m "feat: add PathPreviews"
```

---

### Task 7: ThrowArc

**Files:**
- Create: `src/components/field/ThrowArc.tsx`
- Modify: `src/app/dev/field-preview/page.tsx`

**Interfaces:**
- Consumes: `PlayerState`, `ThrowArc` (type) from `@/types/play`, `toPixel` from `@/lib/field`.
- Produces: `<ThrowArc throwArc players onComplete />` — consumed by `FieldCanvas` in Task 8.

- [ ] **Step 1: Write ThrowArc**

```tsx
// src/components/field/ThrowArc.tsx
'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState, ThrowArc as ThrowArcData } from '@/types/play'

type ThrowArcProps = {
  throwArc: ThrowArcData | undefined
  players: PlayerState[]
  onComplete?: () => void
}

export function ThrowArc({ throwArc, players, onComplete }: ThrowArcProps) {
  if (!throwArc) return null

  const from = players.find((p) => p.id === throwArc.from && !p.isDefense)
  const to = players.find((p) => p.id === throwArc.to && !p.isDefense)
  if (!from || !to) return null

  const start = toPixel(from.x, from.y)
  const end = toPixel(to.x, to.y)

  return (
    <motion.circle
      r={1.4}
      fill="white"
      initial={{ cx: start.px, cy: start.py }}
      animate={{ cx: end.px, cy: end.py }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      onAnimationComplete={onComplete}
    />
  )
}
```

- [ ] **Step 2: Add it to the preview route with a replay button**

```tsx
'use client'
import { useState } from 'react'
// ...existing imports, plus:
import { ThrowArc } from '@/components/field/ThrowArc'

const SAMPLE_THROW = { from: 'H1' as const, to: 'C3' as const }

export default function FieldPreviewPage() {
  const [throwKey, setThrowKey] = useState(0)

  return (
    <div className="p-8 bg-gray-900 min-h-screen flex flex-col items-center justify-center gap-4">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} width={400} height={480} className="border border-white">
        <FieldBackground />
        <ForceIndicator force="forehand" />
        <PathPreviews paths={SAMPLE_PATHS} />
        {SAMPLE_PLAYERS.map((p, i) => (
          <PlayerToken key={i} player={p} isYou={p.id === 'H1'} dimmed={!!p.isDefense} />
        ))}
        <ThrowArc key={throwKey} throwArc={SAMPLE_THROW} players={SAMPLE_PLAYERS} onComplete={() => console.log('throw complete')} />
      </svg>
      <button onClick={() => setThrowKey((k) => k + 1)} className="px-4 py-2 bg-white rounded">
        Replay Throw
      </button>
    </div>
  )
}
```

Note: the page must become a Client Component (add `'use client'` at the top) since it now holds `useState`.

- [ ] **Step 3: Manual verification**

Reload the preview route, click "Replay Throw" — confirm a white disc animates from H1 to C3 over ~0.7s, and the browser console logs "throw complete" each time.

- [ ] **Step 4: Commit**

```bash
git add src/components/field/ThrowArc.tsx src/app/dev/field-preview/page.tsx
git commit -m "feat: add ThrowArc"
```

---

### Task 8: PlayerTokens, DiscMarker, and FieldCanvas

**Files:**
- Create: `src/components/field/PlayerTokens.tsx`
- Create: `src/components/field/DiscMarker.tsx`
- Create: `src/components/field/FieldCanvas.tsx`
- Delete: `src/app/dev/field-preview/page.tsx` (superseded by real usage in Task 14)

**Interfaces:**
- Consumes: every component from Tasks 3–7, `PlayStep`/`Position` from `@/types/play`.
- Produces: `<FieldCanvas step selectedPosition playCategory onThrowComplete />` — consumed by the play page in Task 14.

- [ ] **Step 1: Write PlayerTokens**

```tsx
// src/components/field/PlayerTokens.tsx
import { PlayerToken } from './PlayerToken'
import type { PlayerState, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
}

export function PlayerTokens({ players, selectedPosition, playCategory }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
          />
        )
      })}
    </g>
  )
}
```

The `key` includes offense/defense and index (not just `id`) because a defender shares its matchup's `Position` id — e.g. both the offensive C3 and C3's defender have `id: 'C3'`.

- [ ] **Step 2: Write DiscMarker**

```tsx
// src/components/field/DiscMarker.tsx
'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

export function DiscMarker({ players }: { players: PlayerState[] }) {
  const holder = players.find((p) => p.hasDisc)
  if (!holder) return null

  const { px, py } = toPixel(holder.x, holder.y)
  return (
    <motion.circle
      r={1}
      fill="white"
      stroke="black"
      strokeWidth={0.2}
      animate={{ cx: px + 2.4, cy: py - 2.4 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    />
  )
}
```

- [ ] **Step 3: Write FieldCanvas**

```tsx
// src/components/field/FieldCanvas.tsx
'use client'
import { FIELD_WIDTH, FIELD_HEIGHT } from '@/lib/field'
import { FieldBackground } from './FieldBackground'
import { ForceIndicator } from './ForceIndicator'
import { PathPreviews } from './PathPreviews'
import { PlayerTokens } from './PlayerTokens'
import { DiscMarker } from './DiscMarker'
import { ThrowArc } from './ThrowArc'
import type { PlayStep, Position } from '@/types/play'

type FieldCanvasProps = {
  step: PlayStep
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  onThrowComplete?: () => void
}

export function FieldCanvas({ step, selectedPosition, playCategory, onThrowComplete }: FieldCanvasProps) {
  return (
    <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full" role="img" aria-label={step.label}>
      <FieldBackground />
      <ForceIndicator force={step.force} />
      <PathPreviews paths={step.pathPreviews} />
      <PlayerTokens players={step.players} selectedPosition={selectedPosition} playCategory={playCategory} />
      <DiscMarker players={step.players} />
      <ThrowArc key={step.id} throwArc={step.throw} players={step.players} onComplete={onThrowComplete} />
    </svg>
  )
}
```

`key={step.id}` on `ThrowArc` forces it to remount (and replay its animation) each time the step changes, instead of tweening from wherever the previous throw's circle ended up.

- [ ] **Step 4: Delete the preview route**

```bash
rm -rf src/app/dev
```

- [ ] **Step 5: Manual verification**

Temporarily replace the contents of `src/app/page.tsx` with:

```tsx
'use client'
import { FieldCanvas } from '@/components/field/FieldCanvas'

const SAMPLE_STEP = {
  id: 's1',
  label: 'Sample',
  force: 'forehand' as const,
  players: [
    { id: 'H1' as const, x: 0.5, y: 0.65, hasDisc: true },
    { id: 'C3' as const, x: 0.15, y: 0.35 },
    { id: 'C3' as const, x: 0.18, y: 0.4, isDefense: true },
  ],
  pathPreviews: [],
  narrative: {},
}

export default function Home() {
  return (
    <div className="h-screen">
      <FieldCanvas step={SAMPLE_STEP} selectedPosition="H1" playCategory="offense" />
    </div>
  )
}
```

Run `npm run dev`, open `http://localhost:3000`, confirm the full field composition renders (background, force shading, tokens, disc marker). This placeholder content is overwritten for real in Task 15 — do not commit it as-is.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: compose FieldCanvas from field subcomponents, remove preview route"
```

---

### Task 9: PositionSelector

**Files:**
- Create: `src/components/sidebar/PositionSelector.tsx`

**Interfaces:**
- Consumes: `Position` from `@/types/play`.
- Produces: `<PositionSelector value onChange />` — consumed by `Sidebar` in Task 12.

- [ ] **Step 1: Write PositionSelector**

```tsx
// src/components/sidebar/PositionSelector.tsx
'use client'
import type { Position } from '@/types/play'

const ALL_POSITIONS: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']

type PositionSelectorProps = {
  value: Position
  onChange: (position: Position) => void
}

export function PositionSelector({ value, onChange }: PositionSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <span>🎯 You are:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Position)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {ALL_POSITIONS.map((pos) => (
          <option key={pos} value={pos}>{pos}</option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 2: Manual verification**

Mount it temporarily inside `src/app/page.tsx` (below the `FieldCanvas` from Task 8, wrapped in `useState<Position>('H1')`), confirm the dropdown lists all 7 positions and changes value on selection. Do not commit the temporary mount.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/PositionSelector.tsx
git commit -m "feat: add PositionSelector"
```

---

### Task 10: NarrativePanel

**Files:**
- Create: `src/components/sidebar/NarrativePanel.tsx`

**Interfaces:**
- Produces: `<NarrativePanel text />` — consumed by `Sidebar` in Task 12.

- [ ] **Step 1: Write NarrativePanel**

```tsx
// src/components/sidebar/NarrativePanel.tsx
export function NarrativePanel({ text }: { text: string | undefined }) {
  return (
    <p className="text-base leading-relaxed">
      {text ?? "You're off the disc for this step — hold your spacing and watch how the play develops."}
    </p>
  )
}
```

- [ ] **Step 2: Manual verification**

Mount it temporarily in `src/app/page.tsx` with `text={undefined}` then with a sample string, confirm both the fallback and the real text render. Do not commit the temporary mount.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/NarrativePanel.tsx
git commit -m "feat: add NarrativePanel"
```

---

### Task 11: usePlayStep hook + StepControls

**Files:**
- Create: `src/hooks/usePlayStep.ts`
- Create: `src/components/sidebar/StepControls.tsx`

**Interfaces:**
- Consumes: `Play`, `PlayStep` from `@/types/play`.
- Produces: `usePlayStep(play)` returning `{ step, stepIndex, totalSteps, isFirst, isLast, next, prev, reset }` — consumed by the play page in Task 14. `<StepControls stepIndex totalSteps isFirst isLast nextDisabled onPrev onNext />` — consumed by `Sidebar` in Task 12. (`nextDisabled` is unused until Task 17's quiz gating but is part of the interface now so Task 12 doesn't need to touch this file again.)

- [ ] **Step 1: Write usePlayStep**

```typescript
// src/hooks/usePlayStep.ts
'use client'
import { useState } from 'react'
import type { Play, PlayStep } from '@/types/play'

export function usePlayStep(play: Play) {
  const [stepIndex, setStepIndex] = useState(0)

  const step: PlayStep = play.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === play.steps.length - 1

  function next() {
    setStepIndex((i) => Math.min(i + 1, play.steps.length - 1))
  }

  function prev() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  function reset() {
    setStepIndex(0)
  }

  return { step, stepIndex, totalSteps: play.steps.length, isFirst, isLast, next, prev, reset }
}
```

- [ ] **Step 2: Write StepControls**

```tsx
// src/components/sidebar/StepControls.tsx
type StepControlsProps = {
  stepIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  nextDisabled?: boolean
  onPrev: () => void
  onNext: () => void
}

export function StepControls({ stepIndex, totalSteps, isFirst, isLast, nextDisabled, onPrev, onNext }: StepControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <button onClick={onPrev} disabled={isFirst} className="px-3 py-1 rounded border disabled:opacity-30">
          ◀ Prev
        </button>
        <button onClick={onNext} disabled={isLast || nextDisabled} className="px-3 py-1 rounded border disabled:opacity-30">
          Next ▶
        </button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === stepIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Mount `StepControls` temporarily in `src/app/page.tsx` driven by a real `usePlayStep` call against a 3-step fake `Play` object, confirm Prev/Next move the dots and disable at the ends. Do not commit the temporary mount.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePlayStep.ts src/components/sidebar/StepControls.tsx
git commit -m "feat: add usePlayStep hook and StepControls"
```

---

### Task 12: PlayHeader + Sidebar

**Files:**
- Create: `src/components/sidebar/PlayHeader.tsx`
- Create: `src/components/sidebar/Sidebar.tsx`

**Interfaces:**
- Consumes: `PositionSelector` (Task 9), `NarrativePanel` (Task 10), `StepControls` (Task 11), `Play`/`PlayStep`/`Position` from `@/types/play`.
- Produces: `<Sidebar play step stepIndex selectedPosition onPositionChange isFirst isLast onPrev onNext />` — consumed by the play page in Task 14.

- [ ] **Step 1: Write PlayHeader**

```tsx
// src/components/sidebar/PlayHeader.tsx
export function PlayHeader({ name, stepLabel, stepIndex, totalSteps }: { name: string; stepLabel: string; stepIndex: number; totalSteps: number }) {
  return (
    <div>
      <h1 className="text-lg font-bold">Mousetrap Plays</h1>
      <h2 className="text-sm text-gray-500">{name} — {stepLabel} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
```

- [ ] **Step 2: Write Sidebar**

```tsx
// src/components/sidebar/Sidebar.tsx
import type { Play, PlayStep, Position } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'

type SidebarProps = {
  play: Play
  step: PlayStep
  stepIndex: number
  selectedPosition: Position
  onPositionChange: (p: Position) => void
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
}

export function Sidebar({ play, step, stepIndex, selectedPosition, onPositionChange, isFirst, isLast, onPrev, onNext }: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} />
      <StepControls
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={onPrev}
        onNext={onNext}
      />
    </aside>
  )
}
```

- [ ] **Step 3: Manual verification**

Deferred to Task 14, where `Sidebar` is mounted for real against actual play data.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/PlayHeader.tsx src/components/sidebar/Sidebar.tsx
git commit -m "feat: add PlayHeader and Sidebar"
```

---

### Task 13: Encode the Flood play data

**Files:**
- Create: `src/data/plays/flood.ts`

**Interfaces:**
- Consumes: `Play` from `@/types/play`.
- Produces: `flood: Play` — consumed by the play page and browser in Tasks 14–15.

Source: `Mousetrap Playbook.pdf` p.46 — "Flood": *"This is a play for after the pull or off of a dead disc. Goal: Isolate under space for C1, who can hit a quick continuation throw to C4. C2 and C3 clear to left side rail. C1 (left side rail) cuts across to the open side for initial under throw. C4 is the continuation cutter for C1. If C1 doesn't get the disc, C2 is the second under, activating off a reset. Can be ran from either side; is not force dependent."*

Defenders are held static across all 5 steps at a small goal-side offset from their check — the source material doesn't specify defensive reaction, so this is a deliberate MVP simplification.

- [ ] **Step 1: Write flood.ts**

```typescript
// src/data/plays/flood.ts
import type { Play } from '@/types/play'

export const flood: Play = {
  id: 'flood',
  name: 'Flood',
  category: 'offense',
  set: 'pull-play',
  description:
    "Post-pull play that isolates under space for C1, who looks for a quick continuation throw to C4. Not force-dependent; can be run from either side. Source: Mousetrap Playbook p.46.",
  steps: [
    {
      id: 'flood-1-setup',
      label: 'Setup — Receiving the Pull',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.12, y: 0.55 },
        { id: 'C2', x: 0.16, y: 0.45 },
        { id: 'C3', x: 0.2, y: 0.35 },
        { id: 'C4', x: 0.85, y: 0.28 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.12, y: 0.49, isDefense: true },
        { id: 'C2', x: 0.16, y: 0.39, isDefense: true },
        { id: 'C3', x: 0.2, y: 0.29, isDefense: true },
        { id: 'C4', x: 0.85, y: 0.22, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "You've just secured the pull. C1, C2, and C3 are stacked along the left rail; C4 is poised deep on the right looking for a continuation look. Get ready to hit whoever clears open first.",
        H2: 'Set up as break-side handler support — stay wide and available for a reset if the flow stalls.',
        H3: "You're the open-side handler. Give H1 an easy reset option while the cutters go to work.",
        C1: "You're on the left rail. In a moment you'll cut across to the open side for the first under look.",
        C2: "You're stacked behind C1 on the rail — you're the second under option if C1 doesn't get the disc.",
        C3: "You're also on the rail. Get ready to clear out and create room for C1's cut.",
        C4: "You're isolated deep on the open side — the continuation target once C1 catches the first pass.",
      },
    },
    {
      id: 'flood-2-clear',
      label: 'C2 and C3 Clear to the Rail',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.12, y: 0.55 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.1, y: 0.3 },
        { id: 'C4', x: 0.85, y: 0.28 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.12, y: 0.49, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.1, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.85, y: 0.22, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C2', points: [{ x: 0.16, y: 0.45 }, { x: 0.08, y: 0.4 }], type: 'clear' },
        { playerId: 'C3', points: [{ x: 0.2, y: 0.35 }, { x: 0.1, y: 0.3 }], type: 'clear' },
      ],
      narrative: {
        H1: "C2 and C3 are clearing tight to the left rail, emptying the middle of the field for C1's cut.",
        C1: 'Hold your position for a beat — let C2 and C3 clear the space you\'re about to attack.',
        C2: "Clear hard to the rail — stay out of C1's cutting lane.",
        C3: 'Same for you — clear tight to the sideline so the middle is wide open.',
        C4: "Stay isolated deep — don't drift into the space C1 is about to attack.",
        H2: "Hold your spacing; watch for C1's cut to develop.",
        H3: "Hold your spacing; watch for C1's cut to develop.",
      },
    },
    {
      id: 'flood-3-under-cut',
      label: 'C1 Cuts Across for the Under',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.45, y: 0.5 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.1, y: 0.3 },
        { id: 'C4', x: 0.85, y: 0.28 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.45, y: 0.44, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.1, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.85, y: 0.22, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C1', points: [{ x: 0.12, y: 0.55 }, { x: 0.45, y: 0.5 }], type: 'primary' },
      ],
      throw: { from: 'H1', to: 'C1' },
      narrative: {
        H1: 'C1 is cutting across underneath into the vacated middle. Hit them with the quick under throw.',
        C1: 'Cut hard across to the open side under the disc. Look for the throw immediately.',
        C4: "Stay alert deep — you're next if C1 connects.",
        C2: "If C1 doesn't come down with it, you're the next under option off a reset.",
        C3: 'Hold your spacing and watch the under develop.',
        H2: 'Hold your spacing and watch the under develop.',
        H3: 'Hold your spacing and watch the under develop.',
      },
    },
    {
      id: 'flood-4-continuation',
      label: 'Continuation to C4',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62 },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.45, y: 0.5, hasDisc: true },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.1, y: 0.3 },
        { id: 'C4', x: 0.7, y: 0.32 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.45, y: 0.44, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.1, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.7, y: 0.26, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C4', points: [{ x: 0.85, y: 0.28 }, { x: 0.7, y: 0.32 }], type: 'primary' },
      ],
      throw: { from: 'C1', to: 'C4' },
      narrative: {
        C1: 'Disc secured! C4 is your continuation look — hit them right away before the defense recovers.',
        C4: "This is your window — continue the flow. Catch and look upfield immediately.",
        H1: 'Great under connect. Watch C4 for the continuation.',
        C2: 'Continue upfield spacing, ready to reset the flow.',
        C3: 'Continue upfield spacing, ready to reset the flow.',
        H2: 'Continue upfield spacing, ready to reset the flow.',
        H3: 'Continue upfield spacing, ready to reset the flow.',
      },
    },
    {
      id: 'flood-5-reset-option',
      label: 'Reset Option (if C1 is Covered)',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62 },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.45, y: 0.5 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.1, y: 0.3 },
        { id: 'C4', x: 0.7, y: 0.32, hasDisc: true },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.45, y: 0.44, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.1, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.7, y: 0.26, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "If C1's under look is covered, C2 becomes the second under option off a reset — we keep working the disc up the line.",
        C1: "If you don't get the under look, stay patient — C2 is next up as the backup under cutter.",
        C2: "You're the release valve: if C1 is covered, cut under next off the reset.",
        C4: 'Whether the disc comes to you now or after a reset, stay ready as the continuation target.',
        C3: 'Stay wide on the rail as an outlet.',
        H2: 'Stay ready to reset the disc if the flow needs to restart.',
        H3: 'Stay ready to reset the disc if the flow needs to restart.',
      },
    },
  ],
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/plays/flood.ts
git commit -m "feat: encode Flood play data from Mousetrap Playbook p.46"
```

---

### Task 14: Play viewer page

**Files:**
- Create: `src/app/plays/[playId]/page.tsx`

**Interfaces:**
- Consumes: `FieldCanvas` (Task 8), `Sidebar` (Task 12), `usePlayStep` (Task 11), `flood` (Task 13).
- Produces: the `/plays/flood` route.

- [ ] **Step 1: Write the play page**

```tsx
// src/app/plays/[playId]/page.tsx
'use client'
import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { FieldCanvas } from '@/components/field/FieldCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { usePlayStep } from '@/hooks/usePlayStep'
import { flood } from '@/data/plays/flood'
import type { Play, Position } from '@/types/play'

const PLAYS: Record<string, Play> = {
  flood,
}

export default function PlayPage({ params }: { params: Promise<{ playId: string }> }) {
  const { playId } = use(params)
  const play = PLAYS[playId]
  if (!play) notFound()

  const [selectedPosition, setSelectedPosition] = useState<Position>('H1')
  const { step, stepIndex, isFirst, isLast, next, prev } = usePlayStep(play)

  return (
    <main className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-[65%] h-full">
        <FieldCanvas step={step} selectedPosition={selectedPosition} playCategory={play.category} />
      </div>
      <Sidebar
        play={play}
        step={step}
        stepIndex={stepIndex}
        selectedPosition={selectedPosition}
        onPositionChange={setSelectedPosition}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={prev}
        onNext={next}
      />
    </main>
  )
}
```

`params` is a `Promise` and unwrapped with `use()` — this is required by Next.js 15's App Router, not optional boilerplate.

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/plays/flood` — confirm the field renders Step 1 of Flood, the position dropdown defaults to H1, clicking Next advances through all 5 steps (tokens glide, the throw disc animates on steps 3 and 4), narrative text changes per position, and Prev/Next disable correctly at the ends.

- [ ] **Step 3: Commit**

```bash
git add src/app/plays/[playId]/page.tsx
git commit -m "feat: add play viewer page for /plays/[playId]"
```

---

### Task 15: Play browser page

**Files:**
- Modify: `src/app/page.tsx` (replace scratch content from Task 8's verification step with the real homepage)

**Interfaces:**
- Consumes: `flood` (Task 13), `Play` from `@/types/play`.
- Produces: the `/` route listing available plays.

- [ ] **Step 1: Write the play browser**

```tsx
// src/app/page.tsx
import Link from 'next/link'
import { flood } from '@/data/plays/flood'
import type { Play } from '@/types/play'

const PLAYS: Play[] = [flood]

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mousetrap Plays</h1>
      <ul className="flex flex-col gap-3">
        {PLAYS.map((play) => (
          <li key={play.id}>
            <Link href={`/plays/${play.id}`} className="block rounded border border-gray-200 p-4 hover:bg-gray-50">
              <div className="font-semibold">{play.name}</div>
              <div className="text-sm text-gray-500">{play.category} · {play.set}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Open `http://localhost:3000` — confirm it lists "Flood" with its category/set, and clicking it navigates to `/plays/flood`. This completes Phase 1: the full Watch Mode flow works end to end for one play.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add play browser homepage — Phase 1 MVP complete"
```

---

## Phase 2 — Quiz Mode + Ho Stack

### Task 16: QuizPanel

**Files:**
- Create: `src/components/sidebar/QuizPanel.tsx`

**Interfaces:**
- Consumes: `Quiz` from `@/types/play`.
- Produces: `<QuizPanel quiz onAnswered />` — consumed by `Sidebar` in Task 17.

- [ ] **Step 1: Write QuizPanel**

```tsx
// src/components/sidebar/QuizPanel.tsx
'use client'
import { useState } from 'react'
import type { Quiz } from '@/types/play'

type QuizPanelProps = {
  quiz: Quiz
  onAnswered: (correct: boolean) => void
}

export function QuizPanel({ quiz, onAnswered }: QuizPanelProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    onAnswered(index === quiz.correctIndex)
  }

  return (
    <div className="rounded border border-gray-200 p-3 flex flex-col gap-2">
      <p className="font-medium">{quiz.question}</p>
      {quiz.options.map((option, index) => {
        const isSelected = selected === index
        const isCorrect = index === quiz.correctIndex
        const showResult = selected !== null

        return (
          <button
            key={option}
            onClick={() => handleSelect(index)}
            disabled={selected !== null}
            className={`text-left rounded border px-3 py-2 ${
              showResult && isCorrect ? 'border-green-500 bg-green-50' :
              showResult && isSelected ? 'border-red-500 bg-red-50' :
              'border-gray-200'
            }`}
          >
            {option}
          </button>
        )
      })}
      {selected !== null && <p className="text-sm text-gray-600">{quiz.explanation}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Mount it temporarily in `src/app/page.tsx` with a hardcoded `Quiz` object, confirm selecting the correct option highlights green and shows the explanation, selecting a wrong option highlights that option red (and still shows the explanation), and all buttons disable after one selection. Do not commit the temporary mount.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/QuizPanel.tsx
git commit -m "feat: add QuizPanel"
```

---

### Task 17: Wire quiz gating into the play page

**Files:**
- Modify: `src/app/plays/[playId]/page.tsx` (Task 14)
- Modify: `src/components/sidebar/Sidebar.tsx` (Task 12)

**Interfaces:**
- Consumes: `QuizPanel` (Task 16), `StepControls`'s existing `nextDisabled` prop (Task 11).
- Produces: `Sidebar` gains `quiz`, `quizPassed`, `onQuizAnswered` props; Next is disabled on any step that has a quiz for the selected position until it's answered correctly.

- [ ] **Step 1: Extend Sidebar to render QuizPanel and gate Next**

```tsx
// src/components/sidebar/Sidebar.tsx
import type { Play, PlayStep, Position, Quiz } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'
import { QuizPanel } from './QuizPanel'

type SidebarProps = {
  play: Play
  step: PlayStep
  stepIndex: number
  selectedPosition: Position
  onPositionChange: (p: Position) => void
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  quiz: Quiz | undefined
  quizPassed: boolean
  onQuizAnswered: (correct: boolean) => void
}

export function Sidebar({
  play, step, stepIndex, selectedPosition, onPositionChange,
  isFirst, isLast, onPrev, onNext, quiz, quizPassed, onQuizAnswered,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} />
      {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} />}
      <StepControls
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!!quiz && !quizPassed}
        onPrev={onPrev}
        onNext={onNext}
      />
    </aside>
  )
}
```

- [ ] **Step 2: Track quiz-passed state in the play page**

```tsx
// src/app/plays/[playId]/page.tsx
'use client'
import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { FieldCanvas } from '@/components/field/FieldCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { usePlayStep } from '@/hooks/usePlayStep'
import { flood } from '@/data/plays/flood'
import type { Play, Position } from '@/types/play'

const PLAYS: Record<string, Play> = {
  flood,
}

export default function PlayPage({ params }: { params: Promise<{ playId: string }> }) {
  const { playId } = use(params)
  const play = PLAYS[playId]
  if (!play) notFound()

  const [selectedPosition, setSelectedPosition] = useState<Position>('H1')
  const { step, stepIndex, isFirst, isLast, next, prev } = usePlayStep(play)
  const [quizPassed, setQuizPassed] = useState(false)

  useEffect(() => {
    setQuizPassed(false)
  }, [stepIndex, selectedPosition])

  const quiz = step.quiz?.[selectedPosition]

  return (
    <main className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-[65%] h-full">
        <FieldCanvas step={step} selectedPosition={selectedPosition} playCategory={play.category} />
      </div>
      <Sidebar
        play={play}
        step={step}
        stepIndex={stepIndex}
        selectedPosition={selectedPosition}
        onPositionChange={setSelectedPosition}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={prev}
        onNext={next}
        quiz={quiz}
        quizPassed={quizPassed}
        onQuizAnswered={(correct) => correct && setQuizPassed(true)}
      />
    </main>
  )
}
```

- [ ] **Step 3: Add a quiz to one Flood step so gating is actually exercisable**

Modify `src/data/plays/flood.ts`, step `flood-3-under-cut`, adding a `quiz` field for `C1`:

```typescript
quiz: {
  C1: {
    question: "You're cutting under. If you don't get the disc here, who's the next under option?",
    options: ['C2', 'C3', 'C4', 'H2'],
    correctIndex: 0,
    explanation: 'C2 is the second under, activating off a reset if C1 is covered.',
  },
},
```

- [ ] **Step 4: Manual verification**

Open `/plays/flood`, select position C1, advance to step 3 — confirm Next is disabled until the quiz is answered, answering correctly enables Next, and switching to a different position (no quiz on that position for this step) leaves Next enabled immediately.

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx src/app/plays/[playId]/page.tsx src/data/plays/flood.ts
git commit -m "feat: gate step advancement on quiz completion"
```

---

### Task 18: Encode Ho Stack center-field flow

**Files:**
- Create: `src/data/plays/ho-stack-center.ts`
- Modify: `src/app/plays/[playId]/page.tsx` and `src/app/page.tsx` (register the new play)

**Interfaces:**
- Consumes: `Play` from `@/types/play`.
- Produces: `hoStackCenter: Play` at route `/plays/ho-stack-center`.

Source: `Mousetrap Playbook.pdf` pp.9–13 — "Horizontal Stack: Cutters/Handlers/Cutter Movement". Roles: *H1 = Ratchet (middle handler), H2 = Breakside Handler, H3 = Open-side Handler, C2/C3 = Active Cutters (closest to disc), C1/C4 = Rail Cutters.* Movement: *"First cut attacks the open side under space... Option 1 (common): Open side cutter (C3) under, break side cutter (C2) drifts deep. C3 clears to the break side after cutting into the open space — this break side space is still viable for a break throw... If the break throw goes off to C3, C1 and C2 become the new active cutters. C2 is the primary cutter, the first look to the open side... The reset handler (H3) can push into the cutter space."*

- [ ] **Step 1: Write ho-stack-center.ts**

```typescript
// src/data/plays/ho-stack-center.ts
import type { Play } from '@/types/play'

export const hoStackCenter: Play = {
  id: 'ho-stack-center',
  name: 'Ho Stack — Center Field Flow',
  category: 'offense',
  set: 'ho-stack',
  description:
    "Center-field cutter movement out of the horizontal stack: C3 attacks the open-side under, C2 drifts deep, and the break side stays live if the first look is covered. Source: Mousetrap Playbook pp.9-13.",
  steps: [
    {
      id: 'hsc-1-setup',
      label: 'Setup — Horizontal Stack',
      force: 'forehand',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.65, y: 0.68 },
        { id: 'H3', x: 0.35, y: 0.68 },
        { id: 'C1', x: 0.1, y: 0.45 },
        { id: 'C2', x: 0.35, y: 0.4 },
        { id: 'C3', x: 0.65, y: 0.4 },
        { id: 'C4', x: 0.9, y: 0.45 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.65, y: 0.62, isDefense: true },
        { id: 'H3', x: 0.35, y: 0.62, isDefense: true },
        { id: 'C1', x: 0.1, y: 0.39, isDefense: true },
        { id: 'C2', x: 0.35, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.65, y: 0.34, isDefense: true },
        { id: 'C4', x: 0.9, y: 0.39, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "You're the Ratchet — the middle handler. C3 is your open-side active cutter, C2 is break side. Look for the first cut.",
        H2: "You're the break-side handler — hold width in case the flow swings your way.",
        H3: "You're the open-side handler — stay available as a reset outlet.",
        C1: "You're a rail cutter on the left — stay patient and available if the flow rotates your way.",
        C2: "You're an active cutter. On this rep, you'll drift deep to the break side after C3 initiates.",
        C3: "You're an active cutter and today's primary — you'll attack the open-side under space first.",
        C4: "You're a rail cutter on the right — hold your spacing.",
      },
    },
    {
      id: 'hsc-2-first-cut',
      label: 'C3 Attacks the Open-Side Under',
      force: 'forehand',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.65, y: 0.68 },
        { id: 'H3', x: 0.35, y: 0.68 },
        { id: 'C1', x: 0.1, y: 0.45 },
        { id: 'C2', x: 0.4, y: 0.25 },
        { id: 'C3', x: 0.55, y: 0.52 },
        { id: 'C4', x: 0.9, y: 0.45 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.65, y: 0.62, isDefense: true },
        { id: 'H3', x: 0.35, y: 0.62, isDefense: true },
        { id: 'C1', x: 0.1, y: 0.39, isDefense: true },
        { id: 'C2', x: 0.4, y: 0.19, isDefense: true },
        { id: 'C3', x: 0.55, y: 0.46, isDefense: true },
        { id: 'C4', x: 0.9, y: 0.39, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C3', points: [{ x: 0.65, y: 0.4 }, { x: 0.55, y: 0.52 }], type: 'primary' },
        { playerId: 'C2', points: [{ x: 0.35, y: 0.4 }, { x: 0.4, y: 0.25 }], type: 'clear' },
      ],
      narrative: {
        H1: 'C3 is attacking the open-side under space — this is your first look.',
        C3: 'Attack the open-side under hard. Look for the disc immediately.',
        C2: 'Drift deep to the break side — you stay live as a break-throw target if C3 is taken away.',
        H2: 'Watch the break side — C2 drifting deep is a live option if H1 looks that way.',
        H3: 'Hold your spacing as the reset outlet.',
        C1: 'Hold your spacing on the rail.',
        C4: 'Hold your spacing on the rail.',
      },
    },
    {
      id: 'hsc-3-break-look',
      label: 'Break Throw to C3 in the Clear-Out Space',
      force: 'forehand',
      players: [
        { id: 'H1', x: 0.5, y: 0.62 },
        { id: 'H2', x: 0.65, y: 0.68 },
        { id: 'H3', x: 0.35, y: 0.68 },
        { id: 'C1', x: 0.1, y: 0.45 },
        { id: 'C2', x: 0.4, y: 0.25 },
        { id: 'C3', x: 0.7, y: 0.35, hasDisc: true },
        { id: 'C4', x: 0.9, y: 0.45 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.65, y: 0.62, isDefense: true },
        { id: 'H3', x: 0.35, y: 0.62, isDefense: true },
        { id: 'C1', x: 0.1, y: 0.39, isDefense: true },
        { id: 'C2', x: 0.4, y: 0.19, isDefense: true },
        { id: 'C3', x: 0.7, y: 0.29, isDefense: true },
        { id: 'C4', x: 0.9, y: 0.39, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C3', points: [{ x: 0.55, y: 0.52 }, { x: 0.7, y: 0.35 }], type: 'secondary' },
      ],
      throw: { from: 'H1', to: 'C3' },
      narrative: {
        H1: "C3 cleared to the break side after the under — that space is still live for a break throw. Hit it.",
        C3: "You cleared to the break side after your under cut — stay ready, this space is still viable for the disc.",
        C2: "If the break throw goes to C3, you and C1 become the new active cutters.",
        H2: 'Good break connection — reset the shape now.',
        H3: 'Reset outlet stays available.',
        C1: 'Get ready — you and C2 are next up as active cutters.',
        C4: 'Hold your spacing on the rail.',
      },
    },
    {
      id: 'hsc-4-new-actives',
      label: 'C1 and C2 Become the New Active Cutters',
      force: 'forehand',
      players: [
        { id: 'H1', x: 0.5, y: 0.62 },
        { id: 'H2', x: 0.65, y: 0.68 },
        { id: 'H3', x: 0.4, y: 0.55 },
        { id: 'C1', x: 0.3, y: 0.45 },
        { id: 'C2', x: 0.55, y: 0.4 },
        { id: 'C3', x: 0.7, y: 0.35, hasDisc: true },
        { id: 'C4', x: 0.9, y: 0.45 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.65, y: 0.62, isDefense: true },
        { id: 'H3', x: 0.4, y: 0.49, isDefense: true },
        { id: 'C1', x: 0.3, y: 0.39, isDefense: true },
        { id: 'C2', x: 0.55, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.7, y: 0.29, isDefense: true },
        { id: 'C4', x: 0.9, y: 0.39, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'H3', points: [{ x: 0.35, y: 0.68 }, { x: 0.4, y: 0.55 }], type: 'reset' },
      ],
      narrative: {
        C2: "You're now the primary cutter — first look to the open side.",
        C1: "You're now an active cutter alongside C2.",
        H3: "The cutter space near you is open, so you're pushing into it as the reset handler.",
        C3: 'Reset the shape now that the disc has moved.',
        H1: 'Watch the new active cutters develop the next look.',
        H2: 'Hold width, stay available.',
        C4: 'Hold your spacing on the rail.',
      },
    },
  ],
}
```

- [ ] **Step 2: Register the new play in both routes**

In `src/app/plays/[playId]/page.tsx`, add `import { hoStackCenter } from '@/data/plays/ho-stack-center'` and add `'ho-stack-center': hoStackCenter,` to the `PLAYS` record. In `src/app/page.tsx`, add the same import and add `hoStackCenter` to the `PLAYS` array.

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
```

Then `npm run dev`, open `/plays/ho-stack-center`, step through all 4 steps as C3 and then as H1, confirm narrative and field movement match the description above.

- [ ] **Step 4: Commit**

```bash
git add src/data/plays/ho-stack-center.ts src/app/plays/[playId]/page.tsx src/app/page.tsx
git commit -m "feat: encode Ho Stack center-field flow from Mousetrap Playbook pp.9-13"
```

---

### Task 19: Branching data model + branching UI

**Files:**
- Modify: `src/types/play.ts` (Task 2)
- Modify: `src/hooks/usePlayStep.ts` (Task 11)
- Create: `src/components/sidebar/BranchChoice.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx` (Task 17)
- Modify: `src/app/plays/[playId]/page.tsx` (Task 17)

**Interfaces:**
- Produces: `PlayBranch` type; `PlayStep.branches?: PlayBranch[]`; `usePlayStep` gains `goToStep(stepId)` and switches from index-based to history-stack-based navigation; `<BranchChoice branches onChoose />`.

Steps already have a unique `id: string` field (Task 2) — branching reuses it as the graph's node key instead of adding a new field.

- [ ] **Step 1: Add PlayBranch to the type file**

```typescript
// src/types/play.ts — add after ThrowArc, before Quiz
export type PlayBranch = {
  id: string
  label: string // e.g. "C1 gets the under look" vs "C1 is covered"
  nextStepId: string
}
```

And add one field to `PlayStep`:

```typescript
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
```

- [ ] **Step 2: Rewrite usePlayStep around a history stack**

A plain `stepIndex` can't represent "the learner chose branch B, which may not be `index + 1`." A stack of visited step ids replaces it; `prev` pops the stack instead of decrementing an index.

```typescript
// src/hooks/usePlayStep.ts
'use client'
import { useState } from 'react'
import type { Play, PlayStep } from '@/types/play'

export function usePlayStep(play: Play) {
  const [history, setHistory] = useState<string[]>([play.steps[0].id])
  const currentStepId = history[history.length - 1]
  const step = play.steps.find((s) => s.id === currentStepId) as PlayStep
  const linearIndex = play.steps.findIndex((s) => s.id === currentStepId)

  const isFirst = history.length === 1
  const isLast = !step.branches?.length && linearIndex === play.steps.length - 1

  function next() {
    if (step.branches?.length) return
    const nextStep = play.steps[linearIndex + 1]
    if (nextStep) setHistory((h) => [...h, nextStep.id])
  }

  function goToStep(stepId: string) {
    setHistory((h) => [...h, stepId])
  }

  function prev() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }

  function reset() {
    setHistory([play.steps[0].id])
  }

  return { step, stepIndex: linearIndex, totalSteps: play.steps.length, isFirst, isLast, next, prev, goToStep, reset }
}
```

`next()` becomes a no-op when the current step has branches — the UI must render `BranchChoice` in that case instead of relying on the Next button.

- [ ] **Step 3: Write BranchChoice**

```tsx
// src/components/sidebar/BranchChoice.tsx
import type { PlayBranch } from '@/types/play'

export function BranchChoice({ branches, onChoose }: { branches: PlayBranch[]; onChoose: (branch: PlayBranch) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-500">What happens next?</p>
      {branches.map((branch) => (
        <button
          key={branch.id}
          onClick={() => onChoose(branch)}
          className="rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
        >
          {branch.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wire BranchChoice into Sidebar in place of the Next button when branches exist**

```tsx
// src/components/sidebar/Sidebar.tsx
import type { Play, PlayStep, Position, Quiz, PlayBranch } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'
import { QuizPanel } from './QuizPanel'
import { BranchChoice } from './BranchChoice'

type SidebarProps = {
  play: Play
  step: PlayStep
  stepIndex: number
  selectedPosition: Position
  onPositionChange: (p: Position) => void
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  onChooseBranch: (branch: PlayBranch) => void
  quiz: Quiz | undefined
  quizPassed: boolean
  onQuizAnswered: (correct: boolean) => void
}

export function Sidebar({
  play, step, stepIndex, selectedPosition, onPositionChange,
  isFirst, isLast, onPrev, onNext, onChooseBranch, quiz, quizPassed, onQuizAnswered,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} />
      {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} />}
      {step.branches?.length ? (
        <BranchChoice branches={step.branches} onChoose={onChooseBranch} />
      ) : (
        <StepControls
          stepIndex={stepIndex}
          totalSteps={play.steps.length}
          isFirst={isFirst}
          isLast={isLast}
          nextDisabled={!!quiz && !quizPassed}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </aside>
  )
}
```

Note: when branching, Prev is only reachable via a dedicated control since `StepControls` (which owns the Prev button) is swapped out entirely for `BranchChoice`. Add a small standalone "◀ Prev" button above `BranchChoice` in the same file, wired to `onPrev`, so backing out of a branch choice remains possible.

- [ ] **Step 5: Wire goToStep into the play page**

In `src/app/plays/[playId]/page.tsx`, destructure `goToStep` from `usePlayStep`, pass `onChooseBranch={(branch) => goToStep(branch.nextStepId)}` to `Sidebar`.

- [ ] **Step 6: Manual verification**

Temporarily add a `branches` array to one Flood step in `flood.ts` pointing to two other existing step ids, confirm `BranchChoice` renders instead of Next, and each choice navigates to the right step with Prev still able to back out. Remove the temporary `branches` field from `flood.ts` before committing (Flood itself has no real branch in this data set — Task 20's Reverse play is the first one that uses this feature for real, via its reset-flow step).

- [ ] **Step 7: Commit**

```bash
git add src/types/play.ts src/hooks/usePlayStep.ts src/components/sidebar/BranchChoice.tsx src/components/sidebar/Sidebar.tsx src/app/plays/[playId]/page.tsx
git commit -m "feat: add branching data model and BranchChoice UI"
```

---

## Phase 3 — Full Coverage + Polish

### Task 20: Play registry refactor + encode Reverse (worked example) + remaining-plays checklist

**Files:**
- Create: `src/data/plays/index.ts`
- Create: `src/data/plays/reverse.ts`
- Modify: `src/app/plays/[playId]/page.tsx` (Task 18) — replace the local `PLAYS` record with an import from the new index
- Modify: `src/app/page.tsx` (Task 18) — same

**Interfaces:**
- Produces: `PLAYS: Record<string, Play>` and `ALL_PLAYS: Play[]` from `src/data/plays/index.ts` — every future play file registers here once instead of touching both route files.

Registering each new play by hand-editing two route files (as Tasks 14/15/18 did) doesn't scale to the ~15 remaining plays below. This task centralizes registration first, then demonstrates the full "encode a play from the PDF" pattern once more on **Reverse** — the next play a fresh contributor should copy when working the checklist.

- [ ] **Step 1: Create the play registry**

```typescript
// src/data/plays/index.ts
import type { Play } from '@/types/play'
import { flood } from './flood'
import { hoStackCenter } from './ho-stack-center'
import { reverse } from './reverse'

export const ALL_PLAYS: Play[] = [flood, hoStackCenter, reverse]

export const PLAYS: Record<string, Play> = Object.fromEntries(ALL_PLAYS.map((play) => [play.id, play]))
```

- [ ] **Step 2: Point both routes at the registry**

In `src/app/plays/[playId]/page.tsx`, replace the local `PLAYS` record and its two named imports with:

```typescript
import { PLAYS } from '@/data/plays'
```

In `src/app/page.tsx`, replace the local `PLAYS` array and its imports with:

```typescript
import { ALL_PLAYS } from '@/data/plays'
// ...and rename the `.map((play) =>` call's source from `PLAYS` to `ALL_PLAYS`
```

- [ ] **Step 3: Encode Reverse**

Source: `Mousetrap Playbook.pdf` p.47 — "Reverse": *"This is a play for after the pull or off of a dead disc. Goal: Isolate the deep space for C1. C2, C3, and C4 clear to left side rail. C1 (left side rail) cuts deep to the open side, they should keep an eye out for the fake to initiate them under. If C1 doesn't get the disc, handlers should reset amongst themselves and we should return to our regular flow. Can be ran from either side; is not force dependent. C2 and C3 cut under towards the break side (in this example). C1 (break side rail) cuts deep towards the open side."*

This is Reverse's mirror-image counterpart to Flood: instead of an under cut, C1 fakes under and then breaks deep. It's also the first play to use real branching (Task 19): step 3 offers a choice between "C1 gets the deep shot" and "C1 is covered, reset."

```typescript
// src/data/plays/reverse.ts
import type { Play } from '@/types/play'

export const reverse: Play = {
  id: 'reverse',
  name: 'Reverse',
  category: 'offense',
  set: 'pull-play',
  description:
    "Post-pull play that isolates deep space for C1 off a fake under. Not force-dependent; can be run from either side. Source: Mousetrap Playbook p.47.",
  steps: [
    {
      id: 'reverse-1-setup',
      label: 'Setup — Receiving the Pull',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.12, y: 0.55 },
        { id: 'C2', x: 0.16, y: 0.45 },
        { id: 'C3', x: 0.2, y: 0.35 },
        { id: 'C4', x: 0.24, y: 0.25 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.12, y: 0.49, isDefense: true },
        { id: 'C2', x: 0.16, y: 0.39, isDefense: true },
        { id: 'C3', x: 0.2, y: 0.29, isDefense: true },
        { id: 'C4', x: 0.24, y: 0.19, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "C1, C2, C3, and C4 are stacked along the left rail. Watch for C1's fake under before the deep shot develops.",
        C1: "You're on the rail. In a moment you'll fake under, then break deep to the open side.",
        C2: "You're stacked behind C1 — you'll cut under toward the break side once C1 clears deep.",
        C3: 'Same for you — under toward the break side, behind C2.',
        C4: 'Hold the rail for now; you clear with the others in a moment.',
        H2: 'Stay wide as break-side support.',
        H3: 'Stay available as the open-side reset.',
      },
    },
    {
      id: 'reverse-2-clear',
      label: 'C2, C3, and C4 Clear to the Rail',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.12, y: 0.55 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.09, y: 0.3 },
        { id: 'C4', x: 0.1, y: 0.2 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.12, y: 0.49, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.09, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.1, y: 0.14, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C2', points: [{ x: 0.16, y: 0.45 }, { x: 0.08, y: 0.4 }], type: 'clear' },
        { playerId: 'C3', points: [{ x: 0.2, y: 0.35 }, { x: 0.09, y: 0.3 }], type: 'clear' },
        { playerId: 'C4', points: [{ x: 0.24, y: 0.25 }, { x: 0.1, y: 0.2 }], type: 'clear' },
      ],
      narrative: {
        H1: 'C2, C3, and C4 are clearing tight to the rail, opening the deep space for C1.',
        C1: 'Hold for a beat while the rail clears — then fake under before you go deep.',
        C2: 'Clear tight to the rail — you cut under toward the break side after C1 goes deep.',
        C3: 'Same — clear tight, then under toward the break side behind C2.',
        C4: 'Clear tight to the rail and hold as the deepest outlet.',
        H2: 'Hold your spacing; watch for the deep shot to develop.',
        H3: 'Hold your spacing; watch for the deep shot to develop.',
      },
    },
    {
      id: 'reverse-3-fake-under',
      label: 'C1 Fakes Under, Then Breaks Deep',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.35, y: 0.58 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.09, y: 0.3 },
        { id: 'C4', x: 0.1, y: 0.2 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.35, y: 0.52, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.09, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.1, y: 0.14, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C1', points: [{ x: 0.12, y: 0.55 }, { x: 0.35, y: 0.58 }], type: 'secondary' },
      ],
      narrative: {
        C1: "Show the under fake to freeze your defender — then break deep to the open side.",
        H1: "Watch C1's fake. Don't throw it yet — the deep shot is the real target.",
        C2: 'Get ready — you cut under toward the break side right after this.',
        C3: 'Get ready — same, right behind C2.',
        C4: 'Hold deep as the outlet.',
        H2: 'Hold width; watch for the deep look.',
        H3: 'Hold the reset; watch for the deep look.',
      },
      branches: [
        { id: 'reverse-branch-open', label: 'C1 gets open deep', nextStepId: 'reverse-4-deep-shot' },
        { id: 'reverse-branch-covered', label: 'C1 is covered — reset the flow', nextStepId: 'reverse-5-reset-flow' },
      ],
    },
    {
      id: 'reverse-4-deep-shot',
      label: 'Isolation Deep Shot to C1',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62 },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.6, y: 0.22, hasDisc: true },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.09, y: 0.3 },
        { id: 'C4', x: 0.1, y: 0.2 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.6, y: 0.16, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.09, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.1, y: 0.14, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C1', points: [{ x: 0.35, y: 0.58 }, { x: 0.6, y: 0.22 }], type: 'primary' },
      ],
      throw: { from: 'H1', to: 'C1' },
      narrative: {
        H1: "C1 broke free deep on the open side — put it up.",
        C1: "This is the isolation you worked for — track the deep shot down.",
        C2: 'Hold your under timing in reserve — not needed this rep.',
        C3: 'Hold your under timing in reserve — not needed this rep.',
        C4: 'Stay deep as a safety outlet.',
        H2: 'Reset the shape after the score look.',
        H3: 'Reset the shape after the score look.',
      },
    },
    {
      id: 'reverse-5-reset-flow',
      label: 'Reset Option (if C1 is Covered)',
      force: 'none',
      players: [
        { id: 'H1', x: 0.5, y: 0.62, hasDisc: true },
        { id: 'H2', x: 0.32, y: 0.7 },
        { id: 'H3', x: 0.68, y: 0.7 },
        { id: 'C1', x: 0.35, y: 0.58 },
        { id: 'C2', x: 0.08, y: 0.4 },
        { id: 'C3', x: 0.09, y: 0.3 },
        { id: 'C4', x: 0.1, y: 0.2 },
        { id: 'H1', x: 0.5, y: 0.56, isDefense: true },
        { id: 'H2', x: 0.32, y: 0.64, isDefense: true },
        { id: 'H3', x: 0.68, y: 0.64, isDefense: true },
        { id: 'C1', x: 0.35, y: 0.52, isDefense: true },
        { id: 'C2', x: 0.08, y: 0.34, isDefense: true },
        { id: 'C3', x: 0.09, y: 0.24, isDefense: true },
        { id: 'C4', x: 0.1, y: 0.14, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "If C1 doesn't come down with the deep shot, handlers reset amongst ourselves and return to our regular flow.",
        C1: "If you're covered deep, don't force it — reset and we'll flow back into normal offense.",
        C2: 'Reset your spacing — we return to standard flow from here.',
        C3: 'Reset your spacing — we return to standard flow from here.',
        C4: 'Reset your spacing — we return to standard flow from here.',
        H2: 'Reset the disc amongst the handlers.',
        H3: 'Reset the disc amongst the handlers.',
      },
    },
  ],
}
```

- [ ] **Step 4: Manual verification**

```bash
npx tsc --noEmit
```

Then open `/plays/reverse`, confirm step 3 shows the branch choice instead of a Next button, both choices navigate correctly, and Prev can back out of the branch step. Confirm `/` and `/plays/flood` still work after the registry refactor.

- [ ] **Step 5: Commit**

```bash
git add src/data/plays/index.ts src/data/plays/reverse.ts src/app/plays/[playId]/page.tsx src/app/page.tsx
git commit -m "feat: add play registry and encode Reverse with real branching"
```

- [ ] **Step 6: Remaining-plays checklist**

Every play below follows the exact pattern demonstrated by `flood.ts`, `ho-stack-center.ts`, and `reverse.ts`: read the cited pages with `pdftotext -layout "Mousetrap Playbook.pdf" -`, write a `Play` object with a source citation in `description`, register it in `src/data/plays/index.ts`, verify with `tsc --noEmit` and a manual walkthrough, commit. Treat each bullet as its own task/commit rather than batching them.

- [ ] Garlic (slash-cut pull play variant) — `src/data/plays/garlic.ts` — pp.16, 48
- [ ] Box (side-stack initiation) — `src/data/plays/box.ts` — pp.49-50
- [ ] Zipper, Booty version — `src/data/plays/zipper-booty.ts` — p.51
- [ ] Windmill, Option 1 — `src/data/plays/windmill-1.ts` — p.52
- [ ] Windmill, Option 2 — `src/data/plays/windmill-2.ts` — p.53
- [ ] Vertical Stack — initiation/cutters — `src/data/plays/vert-stack-initiation.ts` — pp.26-29
- [ ] Vertical Stack — continuation cuts — `src/data/plays/vert-stack-continuation.ts` — pp.29-31
- [ ] Vertical Stack — handler movement — `src/data/plays/vert-stack-handler-movement.ts` — pp.32-34
- [ ] Vertical Stack — poach & bracket response — `src/data/plays/vert-stack-poach-bracket.ts` — p.35
- [ ] Endzone — center endzone flow — `src/data/plays/endzone-center-flow.ts` — p.38
- [ ] Endzone — Baby ISO — `src/data/plays/endzone-baby-iso.ts` — p.42
- [ ] Endzone — Cookies (clockwise) — `src/data/plays/endzone-cookies.ts` — p.43
- [ ] Endzone — Cookies and Cream (counter-clockwise) — `src/data/plays/endzone-cookies-and-cream.ts` — p.44
- [ ] Zone offense — roles — `src/data/plays/zone-o-roles.ts` — p.56
- [ ] Zone offense — sideline trap — `src/data/plays/zone-o-sideline-trap.ts` — p.57
- [ ] Person defense — the mark, handler D, cutter D — `src/data/plays/person-defense.ts` (category `'defense'`, set `'person-d'`) — p.60
- [ ] Zone defense — 3-person cup — `src/data/plays/zone-d-cup.ts` (category `'defense'`, set `'zone-d'`) — p.67
- [ ] Zone defense — 2-3-2 — `src/data/plays/zone-d-2-3-2.ts` — pp.67-78, 93
- [ ] Zone defense — 2-4-1 — `src/data/plays/zone-d-2-4-1.ts` — p.67
- [ ] Zone defense — bracket defense — `src/data/plays/zone-d-bracket.ts` — pp.68-69

---

### Task 21: Stall counter

**Files:**
- Create: `src/components/field/StallCounter.tsx`
- Modify: `src/components/field/FieldCanvas.tsx` (Task 8)

**Interfaces:**
- Produces: `<StallCounter startAt active />` — mounted inside `FieldCanvas`'s `<svg>`.

- [ ] **Step 1: Write StallCounter**

`PlayStep.stallCount` (already in the type from Task 2) is the count to display when a step begins; the component ticks it up once per second while the step is active, capped at 10 (the actual stall-out count in ultimate).

```tsx
// src/components/field/StallCounter.tsx
'use client'
import { useEffect, useState } from 'react'

export function StallCounter({ startAt, active }: { startAt: number | undefined; active: boolean }) {
  const [count, setCount] = useState(startAt ?? 0)

  useEffect(() => {
    setCount(startAt ?? 0)
    if (!active || startAt === undefined) return

    const interval = setInterval(() => {
      setCount((c) => Math.min(c + 1, 10))
    }, 1000)

    return () => clearInterval(interval)
  }, [startAt, active])

  if (startAt === undefined) return null

  return (
    <text x={50} y={16} fontSize={5} fill="white" textAnchor="middle" fontWeight="bold">
      Stall {count}
    </text>
  )
}
```

- [ ] **Step 2: Mount it in FieldCanvas**

```tsx
// src/components/field/FieldCanvas.tsx — add the import and render inside the <svg>, after ForceIndicator
import { StallCounter } from './StallCounter'
// ...
<StallCounter startAt={step.stallCount} active={true} />
```

- [ ] **Step 3: Add a stallCount to one step for verification**

Add `stallCount: 3,` to `flood-3-under-cut` in `src/data/plays/flood.ts`.

- [ ] **Step 4: Manual verification**

Open `/plays/flood`, advance to step 3, confirm "Stall 3" appears near the top of the field and ticks up once per second, and confirm it resets when you move to a different step and disappears on steps without `stallCount`.

- [ ] **Step 5: Commit**

```bash
git add src/components/field/StallCounter.tsx src/components/field/FieldCanvas.tsx src/data/plays/flood.ts
git commit -m "feat: add stall counter overlay"
```

---

### Task 22: Terminology tooltip system

**Files:**
- Create: `src/data/glossary.ts`
- Create: `src/components/sidebar/NarrativeWithTooltips.tsx`
- Modify: `src/components/sidebar/NarrativePanel.tsx` (Task 10)
- Modify: `src/components/sidebar/Sidebar.tsx` (Task 19) and `src/components/field/FieldCanvas.tsx` (Task 21) — zone highlight wiring
- Modify: `src/app/plays/[playId]/page.tsx` (Task 20) — lift highlight state

**Interfaces:**
- Produces: `GLOSSARY: Record<string, { definition: string; zone?: { x: number; y: number; width: number; height: number } }>`; `<NarrativeWithTooltips text onHighlightZone />` replaces the plain text render inside `NarrativePanel`.

- [ ] **Step 1: Write the glossary data**

Zones are normalized rectangles in the same 0–1 coordinate space as `PlayerState`, for a translucent highlight on the field.

```typescript
// src/data/glossary.ts
export type GlossaryEntry = {
  definition: string
  zone?: { x: number; y: number; width: number; height: number }
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'break side': {
    definition: "The side of the field away from the mark's force — harder for the defense to take away.",
    zone: { x: 0.5, y: 0.1667, width: 0.5, height: 0.6667 },
  },
  'open side': {
    definition: "The side of the field the mark's force is pushing the thrower away from — the easier throw.",
    zone: { x: 0, y: 0.1667, width: 0.5, height: 0.6667 },
  },
  'under': {
    definition: 'A cut toward the thrower, attacking the space in front of the disc.',
  },
  'continuation': {
    definition: 'The next throw in a fast sequence, hit immediately after the previous catch before the defense resets.',
  },
  'rail': {
    definition: 'The lane running along a sideline, where rail cutters set up and clear.',
  },
  'reset': {
    definition: 'A short, low-risk throw back to a handler used to restart the flow of the offense.',
  },
}
```

- [ ] **Step 2: Write NarrativeWithTooltips**

Splits the narrative string on glossary terms (longest term first, case-insensitive, word-bounded) and wraps matches in a hoverable `<span>`.

```tsx
// src/components/sidebar/NarrativeWithTooltips.tsx
'use client'
import { useState } from 'react'
import { GLOSSARY } from '@/data/glossary'

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)
const TERM_PATTERN = new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')

type NarrativeWithTooltipsProps = {
  text: string
  onHighlightZone: (zone: GlossaryEntryZone | null) => void
}

type GlossaryEntryZone = NonNullable<(typeof GLOSSARY)[string]['zone']>

export function NarrativeWithTooltips({ text, onHighlightZone }: NarrativeWithTooltipsProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const parts = text.split(TERM_PATTERN)

  return (
    <p className="text-base leading-relaxed">
      {parts.map((part, i) => {
        const entry = GLOSSARY[part.toLowerCase()]
        if (!entry) return <span key={i}>{part}</span>

        return (
          <span
            key={i}
            className="underline decoration-dotted cursor-help relative"
            onMouseEnter={() => {
              setOpenTerm(part)
              if (entry.zone) onHighlightZone(entry.zone)
            }}
            onMouseLeave={() => {
              setOpenTerm(null)
              onHighlightZone(null)
            }}
          >
            {part}
            {openTerm === part && (
              <span className="absolute left-0 top-full z-10 w-56 rounded bg-gray-900 text-white text-sm p-2 shadow-lg">
                {entry.definition}
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}
```

- [ ] **Step 3: Fall back to NarrativeWithTooltips inside NarrativePanel**

```tsx
// src/components/sidebar/NarrativePanel.tsx
import { NarrativeWithTooltips } from './NarrativeWithTooltips'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
}

export function NarrativePanel({ text, onHighlightZone }: NarrativePanelProps) {
  if (!text) {
    return (
      <p className="text-base leading-relaxed">
        You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
      </p>
    )
  }

  return <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} />
}
```

- [ ] **Step 4: Lift highlight state up through Sidebar into the play page, render it in FieldCanvas**

In `src/app/plays/[playId]/page.tsx`, add `const [highlightZone, setHighlightZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null)`, pass `onHighlightZone={setHighlightZone}` to `Sidebar`, and pass `highlightZone={highlightZone}` to `FieldCanvas`.

In `Sidebar.tsx`, thread an `onHighlightZone` prop straight through to `NarrativePanel`.

In `FieldCanvas.tsx`, accept `highlightZone` and render it as the last child of the `<svg>` (on top of everything else):

```tsx
{highlightZone && (
  <rect
    x={highlightZone.x * FIELD_WIDTH}
    y={highlightZone.y * FIELD_HEIGHT}
    width={highlightZone.width * FIELD_WIDTH}
    height={highlightZone.height * FIELD_HEIGHT}
    fill="yellow"
    opacity={0.2}
  />
)}
```

- [ ] **Step 5: Manual verification**

Open `/plays/flood`, find a narrative sentence containing "under" or "rail" (both are in the glossary), confirm it's underlined, hovering shows the definition tooltip, and for terms with a `zone` (e.g. add "break side" to one narrative string temporarily) confirm the field highlights the corresponding rectangle while hovered.

- [ ] **Step 6: Commit**

```bash
git add src/data/glossary.ts src/components/sidebar/NarrativeWithTooltips.tsx src/components/sidebar/NarrativePanel.tsx src/components/sidebar/Sidebar.tsx src/components/field/FieldCanvas.tsx src/app/plays/[playId]/page.tsx
git commit -m "feat: add terminology tooltip system with field zone highlighting"
```

---

### Task 23: Progress tracking via localStorage

**Files:**
- Create: `src/hooks/useProgress.ts`
- Modify: `src/app/plays/[playId]/page.tsx` (Task 22) — mark progress on completion
- Modify: `src/app/page.tsx` (Task 20) — show progress per play

**Interfaces:**
- Produces: `useProgress()` returning `{ markComplete(playId, position), isComplete(playId, position), completedCount(playId) }`.

- [ ] **Step 1: Write useProgress**

```typescript
// src/hooks/useProgress.ts
'use client'
import { useEffect, useState } from 'react'
import type { Position } from '@/types/play'

const STORAGE_KEY = 'mousetrap-progress'

type ProgressMap = Record<string, Position[]>

function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  function markComplete(playId: string, position: Position) {
    setProgress((prev) => {
      const completed = prev[playId] ?? []
      if (completed.includes(position)) return prev

      const next = { ...prev, [playId]: [...completed, position] }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isComplete(playId: string, position: Position) {
    return (progress[playId] ?? []).includes(position)
  }

  function completedCount(playId: string) {
    return (progress[playId] ?? []).length
  }

  return { markComplete, isComplete, completedCount }
}
```

The `typeof window === 'undefined'` guard in `loadProgress` matters because this hook's initial render happens during SSR, where `window` doesn't exist; the real value loads client-side in the `useEffect`.

- [ ] **Step 2: Mark completion in the play page**

In `src/app/plays/[playId]/page.tsx`, add `const { markComplete } = useProgress()` and:

```typescript
useEffect(() => {
  if (isLast) markComplete(play.id, selectedPosition)
}, [isLast, play.id, selectedPosition, markComplete])
```

- [ ] **Step 3: Show progress on the play browser**

In `src/app/page.tsx`, use `useProgress` (this makes the page a Client Component — add `'use client'`) and render `{completedCount(play.id)}/7 positions learned` under each play's category/set line.

- [ ] **Step 4: Manual verification**

Open `/plays/flood`, step through to the end as H1, return to `/` and confirm it shows "1/7 positions learned" for Flood. Repeat as C1, confirm it becomes "2/7." Refresh the page and confirm the count persists (localStorage).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProgress.ts src/app/plays/[playId]/page.tsx src/app/page.tsx
git commit -m "feat: track per-position play completion in localStorage"
```

---

### Task 24: Mobile layout

**Files:**
- Modify: `src/app/plays/[playId]/page.tsx` (Task 23)
- Modify: `src/components/sidebar/Sidebar.tsx` (Task 22)
- Modify: `src/components/sidebar/StepControls.tsx` (Task 11)

**Interfaces:**
- No new props — this task is purely Tailwind class changes to the existing component tree, splitting layout behavior at the `md:` breakpoint (already partially in place from Task 14's `flex-col md:flex-row`).

- [ ] **Step 1: Fix the field to a bounded aspect ratio on mobile**

In `src/app/plays/[playId]/page.tsx`, change the field wrapper `div` from `w-full md:w-[65%] h-full` to:

```tsx
<div className="w-full md:w-[65%] aspect-[5/6] md:aspect-auto md:h-full">
```

On mobile this keeps the field a fixed, sane shape instead of stretching to fill unpredictable vertical space; on desktop (`md:`) it reverts to filling the full height of its 65%-width column as before.

- [ ] **Step 2: Make the sidebar scroll independently below the field on mobile**

In `Sidebar.tsx`, change the `<aside>` className from `w-full md:w-[35%] flex flex-col gap-4 p-4 border-l border-gray-200` to:

```tsx
<aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
```

- [ ] **Step 3: Make StepControls sticky at the bottom of the viewport on mobile**

Wrap the outer `div` in `StepControls.tsx` so its className becomes:

```tsx
<div className="flex flex-col gap-2 sticky bottom-0 bg-white md:static md:bg-transparent pt-2">
```

- [ ] **Step 4: Manual verification**

In the browser, use dev tools' device toolbar to simulate a 390×844 viewport on `/plays/flood`. Confirm: the field keeps a reasonable aspect ratio and doesn't overflow, the sidebar sits below it and scrolls independently, Prev/Next stay pinned to the bottom of the screen while narrative text scrolls, and resizing back to desktop width restores the original 65/35 split layout with no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/app/plays/[playId]/page.tsx src/components/sidebar/Sidebar.tsx src/components/sidebar/StepControls.tsx
git commit -m "feat: add mobile layout for the play viewer"
```

---
