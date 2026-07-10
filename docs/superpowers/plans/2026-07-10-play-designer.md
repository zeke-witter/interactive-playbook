# Play Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app `/designer` tool where the user places all 14 fixed tokens, draws cut/clear paths, marks disc possession and throws, and exports the resulting per-step geometry to a JSON file — replacing the current workflow of transcribing hand-drawn diagrams by eye.

**Architecture:** A new unlinked route (`src/app/designer/page.tsx`) composing a state hook (`useDesignerState`), an interactive SVG canvas (`DesignerCanvas` + `DraggableToken`), and a control panel (`DesignerToolbar`). A small Next.js API route writes the exported JSON to a gitignored `designer-output/` directory on save. The canvas reuses the existing `FieldBackground` component and the same path-type color map the shipped viewer uses, so what's drawn here is pixel-identical to what the real app renders.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4 (existing theme tokens only), inline SVG (no new drawing library — pointer events + `getScreenCTM()` for coordinate conversion).

## Global Constraints

- **No automated tests, ever** — project-wide policy for this hobby project. Every task's verification step is manual: run `npx tsc --noEmit`, run the dev server, and check the described behavior in a browser (a one-off Playwright script + screenshot is fine and matches this project's established practice, but there is no permanent test suite to write or maintain).
- **`/designer` must not be linked from any nav, picker, or other page.** Reached only by typing the URL directly. Do not add it to `PlayPicker`, `PickerDrawer`, or anywhere else.
- **Fixed 14-token roster, fixed order**: every step's `players` array is always exactly `[H1, H2, H3, C1, C2, C3, C4]` (offense, no `isDefense`), followed by the same 7 ids again with `isDefense: true`. This matches every existing play file in `src/data/plays/`. Do not build any add/remove-token UI.
- **Coordinate convention** (do not invert): `x`: 0 = left sideline, 1 = right sideline. `y`: 0 = attacking endzone, 1 = own endzone. Use `FIELD_WIDTH`/`FIELD_HEIGHT` from `src/lib/field.ts` (100 and 120) — do not hardcode different values.
- **Reuse existing Tailwind theme tokens only**: `border-border`, `bg-surface`, `bg-bg`, `text-text`, `text-text-muted`, `border-accent`, `bg-accent`, `text-accent-foreground`, `bg-accent-hover`, `text-danger-border`, `font-display`. Do not invent new colors.
- **No narrative/quiz/branch/stall-count authoring in this tool** — the exported data is exactly `{ players, pathPreviews, throw? }` per step. Nothing else.
- Scope is geometry only: positions, paths, disc possession, throws. The yardage grid, flexible rosters, and "denial zone" overlay are explicitly out of scope (per the design doc) — do not add them.

---

### Task 1: Shared path-color map

**Files:**
- Create: `src/lib/pathColors.ts`
- Modify: `src/components/field/PathPreviews.tsx`

**Interfaces:**
- Produces: `export const PATH_COLOR: Record<PlayerPath['type'], string>` — consumed by Task 5 (`DesignerCanvas`) and Task 6 (`DesignerToolbar`).

- [ ] **Step 1: Create the shared color map**

```ts
// src/lib/pathColors.ts
import type { PlayerPath } from '@/types/play'

export const PATH_COLOR: Record<PlayerPath['type'], string> = {
  primary: '#fbbf24',
  secondary: '#93c5fd',
  clear: '#a3a3a3',
  reset: '#f472b6',
}
```

- [ ] **Step 2: Point `PathPreviews.tsx` at the shared map instead of its own copy**

Read the current file first (`src/components/field/PathPreviews.tsx`). Replace the inline `const PATH_COLOR: Record<...> = {...}` block with:

```ts
import { toPixel } from '@/lib/field'
import { PATH_COLOR } from '@/lib/pathColors'
import type { PlayerPath } from '@/types/play'
```

(Remove the old inline `PATH_COLOR` declaration entirely — the import replaces it. The rest of the file, including the `polyline` rendering, is unchanged.)

- [ ] **Step 3: Typecheck and verify**

Run: `npx tsc --noEmit` — expect no errors.

Start the dev server (`npm run dev` if not already running) and load `http://localhost:3000/plays/flood`. Step to "C2, C3, and C4 Clear to the Corner" and confirm the three clear paths still render as dashed grey lines exactly as before (visually unchanged — this task only moved where the color map lives, not its values).

- [ ] **Step 4: Commit**

```bash
git add src/lib/pathColors.ts src/components/field/PathPreviews.tsx
git commit -m "refactor: extract path-type color map to a shared module"
```

---

### Task 2: Designer types and state hook

**Files:**
- Create: `src/types/designer.ts`
- Create: `src/hooks/useDesignerState.ts`

**Interfaces:**
- Consumes: `PlayerState`, `PlayerPath`, `ThrowArc`, `Position` from `@/types/play` (already defined, unchanged).
- Produces: `DesignerStep`, `DesignerMode` types from `@/types/designer`, and the `useDesignerState()` hook whose full return shape is consumed by Tasks 5, 6, and 7:
  - State: `steps: DesignerStep[]`, `currentStepIndex: number`, `currentStep: DesignerStep`, `mode: DesignerMode`, `selectedIndex: number | null`, `pathType: PlayerPath['type']`, `inProgressPath: { playerIndex: number; points: {x:number;y:number}[] } | null`, `isEndzone: boolean`.
  - Actions: `setMode(mode)`, `selectToken(index)`, `moveToken(index,x,y)`, `setPathType(type)`, `startPath(index)`, `addWaypoint(x,y)`, `finishPath()`, `cancelPath()`, `setDiscHolder(index)`, `setThrow(fromIndex,toIndex)`, `addStep()`, `deleteStep(index)`, `goToStep(index)`, `setIsEndzone(value)`.

- [ ] **Step 1: Create the designer-specific types**

```ts
// src/types/designer.ts
import type { PlayerState, PlayerPath, ThrowArc } from './play'

export type DesignerStep = {
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
}

export type DesignerMode = 'position' | 'path' | 'throw'
```

- [ ] **Step 2: Create the state hook**

```ts
// src/hooks/useDesignerState.ts
'use client'
import { useState } from 'react'
import type { DesignerStep, DesignerMode } from '@/types/designer'
import type { PlayerPath, Position } from '@/types/play'

const OFFENSE_ORDER: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']

function defaultStep(): DesignerStep {
  return {
    players: [
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.4 })),
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.5, isDefense: true })),
    ],
    pathPreviews: [],
  }
}

type InProgressPath = { playerIndex: number; points: { x: number; y: number }[] }

export function useDesignerState() {
  const [steps, setSteps] = useState<DesignerStep[]>([defaultStep()])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [modeState, setModeState] = useState<DesignerMode>('position')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [pathType, setPathType] = useState<PlayerPath['type']>('primary')
  const [inProgressPath, setInProgressPath] = useState<InProgressPath | null>(null)
  const [isEndzone, setIsEndzone] = useState(false)

  const currentStep = steps[currentStepIndex]

  function updateStep(index: number, updater: (step: DesignerStep) => DesignerStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? updater(s) : s)))
  }

  function setMode(newMode: DesignerMode) {
    setModeState(newMode)
    setSelectedIndex(null)
    setInProgressPath(null)
  }

  function selectToken(index: number | null) {
    setSelectedIndex(index)
  }

  function moveToken(index: number, x: number, y: number) {
    updateStep(currentStepIndex, (step) => ({
      ...step,
      players: step.players.map((p, i) => (i === index ? { ...p, x, y } : p)),
    }))
  }

  function startPath(index: number) {
    const player = currentStep.players[index]
    setInProgressPath({ playerIndex: index, points: [{ x: player.x, y: player.y }] })
  }

  function addWaypoint(x: number, y: number) {
    setInProgressPath((prev) => (prev ? { ...prev, points: [...prev.points, { x, y }] } : prev))
  }

  function finishPath() {
    if (!inProgressPath || inProgressPath.points.length < 2) {
      setInProgressPath(null)
      return
    }
    const player = currentStep.players[inProgressPath.playerIndex]
    const newPath: PlayerPath = { playerId: player.id, points: inProgressPath.points, type: pathType }
    updateStep(currentStepIndex, (step) => ({
      ...step,
      pathPreviews: [...step.pathPreviews.filter((p) => p.playerId !== player.id), newPath],
    }))
    setInProgressPath(null)
  }

  function cancelPath() {
    setInProgressPath(null)
  }

  function setDiscHolder(index: number) {
    updateStep(currentStepIndex, (step) => ({
      ...step,
      players: step.players.map((p, i) => ({ ...p, hasDisc: i === index })),
    }))
  }

  function setThrow(fromIndex: number, toIndex: number) {
    const from = currentStep.players[fromIndex]
    const to = currentStep.players[toIndex]
    updateStep(currentStepIndex, (step) => ({ ...step, throw: { from: from.id, to: to.id } }))
  }

  function addStep() {
    const duplicated: DesignerStep = {
      players: currentStep.players.map((p) => ({ ...p })),
      pathPreviews: [],
    }
    const newIndex = steps.length
    setSteps((prev) => [...prev, duplicated])
    setCurrentStepIndex(newIndex)
  }

  function deleteStep(index: number) {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
    setCurrentStepIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev))
  }

  function goToStep(index: number) {
    setCurrentStepIndex(index)
  }

  return {
    steps,
    currentStepIndex,
    currentStep,
    mode: modeState,
    setMode,
    selectedIndex,
    selectToken,
    pathType,
    setPathType,
    inProgressPath,
    isEndzone,
    setIsEndzone,
    moveToken,
    startPath,
    addWaypoint,
    finishPath,
    cancelPath,
    setDiscHolder,
    setThrow,
    addStep,
    deleteStep,
    goToStep,
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expect no errors. (There's no UI yet to manually click through — this hook is verified in context once Task 5/6 wire it up. It's safe to typecheck-only here since it has no rendering of its own.)

- [ ] **Step 4: Commit**

```bash
git add src/types/designer.ts src/hooks/useDesignerState.ts
git commit -m "feat: add designer state hook for the play designer tool"
```

---

### Task 3: Draggable token component

**Files:**
- Create: `src/components/designer/DraggableToken.tsx`

**Interfaces:**
- Produces: `DraggableToken` component, consumed by Task 5 (`DesignerCanvas`). Props: `{ x: number; y: number; label: string; isDefense: boolean; isSelected: boolean; isDiscHolder: boolean; draggable: boolean; toSvgPoint: (clientX: number, clientY: number) => {x:number;y:number}; onMove: (x:number,y:number) => void; onClick: () => void }`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/designer/DraggableToken.tsx
'use client'
import { useRef } from 'react'
import { toPixel } from '@/lib/field'

type DraggableTokenProps = {
  x: number
  y: number
  label: string
  isDefense: boolean
  isSelected: boolean
  isDiscHolder: boolean
  draggable: boolean
  toSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
  onMove: (x: number, y: number) => void
  onClick: () => void
}

export function DraggableToken({
  x, y, label, isDefense, isSelected, isDiscHolder, draggable, toSvgPoint, onMove, onClick,
}: DraggableTokenProps) {
  const draggingRef = useRef(false)
  const movedRef = useRef(false)

  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    if (!draggable) return
    draggingRef.current = true
    movedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!draggingRef.current) return
    movedRef.current = true
    const point = toSvgPoint(e.clientX, e.clientY)
    onMove(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    const wasDragging = draggingRef.current
    draggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (!wasDragging || !movedRef.current) {
      onClick()
    }
  }

  const { px, py } = toPixel(x, y)
  const fill = isDefense ? '#dc2626' : '#2563eb'

  return (
    <g
      transform={`translate(${px}, ${py})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: draggable ? 'grab' : 'pointer' }}
    >
      <circle r={3.2} fill={fill} />
      {isSelected && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      {isDiscHolder && <circle cx={2.4} cy={-2.4} r={1} fill="white" stroke="black" strokeWidth={0.2} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </g>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors. (Manual verification happens in Task 5, once this is actually rendered on the canvas — a bare component with no parent has nothing to click.)

- [ ] **Step 3: Commit**

```bash
git add src/components/designer/DraggableToken.tsx
git commit -m "feat: add draggable token component for the play designer"
```

---

### Task 4: Save API route

**Files:**
- Create: `src/app/api/designer/save/route.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `POST /api/designer/save` accepting `{ name: string; steps: DesignerStep[] }`, returning `{ path: string }` on success (200) or `{ error: string }` on failure (400). Consumed by Task 7 (`designer/page.tsx`).

- [ ] **Step 1: Add the gitignore entry**

Read `.gitignore` first, then add a new line (with the other project-specific ignores, or at the end):

```
designer-output/
```

- [ ] **Step 2: Create the API route**

```ts
// src/app/api/designer/save/route.ts
import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, steps } = body as { name?: unknown; steps?: unknown }

  if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps)) {
    return NextResponse.json({ error: 'Missing name or steps' }, { status: 400 })
  }

  const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(process.cwd(), 'designer-output')
  const filename = `${safeName}-${timestamp}.json`

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), JSON.stringify(steps, null, 2))

  return NextResponse.json({ path: `designer-output/${filename}` })
}
```

- [ ] **Step 3: Typecheck and verify with curl**

Run: `npx tsc --noEmit` — expect no errors.

With the dev server running, verify directly (no UI needed yet):

```bash
curl -s -X POST http://localhost:3000/api/designer/save \
  -H "Content-Type: application/json" \
  -d '{"name":"test-play","steps":[{"players":[],"pathPreviews":[]}]}'
```

Expected: a JSON response like `{"path":"designer-output/test-play-2026-07-10T...json"}`, and the file should exist at that path in the repo with the same content that was posted. Also verify the 400 path: `curl -X POST http://localhost:3000/api/designer/save -H "Content-Type: application/json" -d '{}'` should return `{"error":"Missing name or steps"}`.

Clean up the test file afterward: `rm designer-output/test-play-*.json` (it's gitignored, but no reason to leave scratch files lying around).

- [ ] **Step 4: Commit**

```bash
git add .gitignore src/app/api/designer/save/route.ts
git commit -m "feat: add save endpoint for the play designer"
```

---

### Task 5: Designer canvas

**Files:**
- Create: `src/components/designer/DesignerCanvas.tsx`

**Interfaces:**
- Consumes: `useDesignerState()`'s full return shape (Task 2), `DraggableToken` (Task 3), `PATH_COLOR` (Task 1), `FieldBackground` (existing, `src/components/field/FieldBackground.tsx`, prop `showEndzone: boolean`), `GENERIC_DEFENDER_LABELS` (existing, `src/lib/names.ts`).
- Produces: `DesignerCanvas` component, consumed by Task 7 (`designer/page.tsx`). Props: `{ designer: ReturnType<typeof useDesignerState> }`.

- [ ] **Step 1: Create the canvas component**

```tsx
// src/components/designer/DesignerCanvas.tsx
'use client'
import { useRef } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { DraggableToken } from './DraggableToken'
import type { useDesignerState } from '@/hooks/useDesignerState'

type DesignerCanvasProps = {
  designer: ReturnType<typeof useDesignerState>
}

export function DesignerCanvas({ designer }: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    currentStep, mode, selectedIndex, selectToken, moveToken,
    inProgressPath, startPath, addWaypoint, setThrow, isEndzone, pathType,
  } = designer

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(ctm.inverse())
    return { x: transformed.x / FIELD_WIDTH, y: transformed.y / FIELD_HEIGHT }
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (mode !== 'path' || !inProgressPath) return
    const point = toSvgPoint(e.clientX, e.clientY)
    addWaypoint(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handleTokenClick(index: number) {
    if (mode === 'position') {
      selectToken(index)
      return
    }
    if (mode === 'path') {
      if (!inProgressPath) startPath(index)
      return
    }
    if (mode === 'throw') {
      const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)
      if (selectedIndex === null) {
        if (index === holderIndex) selectToken(index)
        return
      }
      if (selectedIndex === holderIndex && index !== holderIndex) {
        setThrow(selectedIndex, index)
        selectToken(null)
      }
    }
  }

  const finishedPaths = currentStep.pathPreviews.map((path, i) => {
    const points = path.points.map((pt) => {
      const { px, py } = toPixel(pt.x, pt.y)
      return `${px},${py}`
    }).join(' ')
    return (
      <polyline
        key={`${path.playerId}-${i}`}
        points={points}
        fill="none"
        stroke={PATH_COLOR[path.type]}
        strokeWidth={0.6}
        strokeDasharray="2,1.5"
      />
    )
  })

  const inProgressLine = inProgressPath && inProgressPath.points.length > 1 && (
    <polyline
      points={inProgressPath.points.map((pt) => {
        const { px, py } = toPixel(pt.x, pt.y)
        return `${px},${py}`
      }).join(' ')}
      fill="none"
      stroke={PATH_COLOR[pathType]}
      strokeWidth={0.6}
      strokeDasharray="2,1.5"
      opacity={0.6}
    />
  )

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
      className="w-full h-full"
      onPointerDown={handleBackgroundPointerDown}
    >
      <FieldBackground showEndzone={isEndzone} />
      {finishedPaths}
      {inProgressLine}
      {currentStep.players.map((player, i) => (
        <DraggableToken
          key={i}
          x={player.x}
          y={player.y}
          label={player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id}
          isDefense={!!player.isDefense}
          isSelected={selectedIndex === i}
          isDiscHolder={!!player.hasDisc}
          draggable={mode === 'position'}
          toSvgPoint={toSvgPoint}
          onMove={(x, y) => moveToken(i, x, y)}
          onClick={() => handleTokenClick(i)}
        />
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Manual verification**

This is the first task where the tool is actually visible, but there's no page yet to mount it on. Create a temporary throwaway page to check it renders (delete it after): add a one-line `export default function Test() { const d = useDesignerState(); return <div style={{height: '100vh'}}><DesignerCanvas designer={d} /></div> }` to `src/app/designer-test/page.tsx`, load `http://localhost:3000/designer-test`, confirm the field renders with 14 tokens in two rows (blue offense on top, red defense below), and delete `src/app/designer-test/` when done — Task 7 builds the real page next.

- [ ] **Step 4: Commit**

```bash
git add src/components/designer/DesignerCanvas.tsx
git commit -m "feat: add interactive canvas for the play designer"
```

---

### Task 6: Designer toolbar

**Files:**
- Create: `src/components/designer/DesignerToolbar.tsx`

**Interfaces:**
- Consumes: `useDesignerState()`'s full return shape (Task 2), `PATH_COLOR` (Task 1).
- Produces: `DesignerToolbar` component, consumed by Task 7. Props: `{ designer: ReturnType<typeof useDesignerState>; onSave: (name: string) => void }`.

- [ ] **Step 1: Create the toolbar component**

```tsx
// src/components/designer/DesignerToolbar.tsx
'use client'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { PlayerPath } from '@/types/play'
import type { DesignerMode } from '@/types/designer'
import { PATH_COLOR } from '@/lib/pathColors'

type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
}

const PATH_TYPES: PlayerPath['type'][] = ['primary', 'secondary', 'clear', 'reset']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', path: 'Draw Path', throw: 'Mark Throw' }
const MODES: DesignerMode[] = ['position', 'path', 'throw']

export function DesignerToolbar({ designer, onSave }: DesignerToolbarProps) {
  const {
    steps, currentStepIndex, currentStep, mode, setMode, selectedIndex,
    pathType, setPathType, inProgressPath, finishPath, cancelPath,
    setDiscHolder, addStep, deleteStep, goToStep, isEndzone, setIsEndzone,
  } = designer

  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-md border text-sm ${
              mode === m ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-text'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === 'path' && (
        <div className="flex items-center gap-2">
          {PATH_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setPathType(t)}
              title={t}
              className="w-5 h-5 rounded-full border-2"
              style={{ backgroundColor: PATH_COLOR[t], borderColor: pathType === t ? 'white' : 'transparent' }}
            />
          ))}
          {inProgressPath && (
            <>
              <button onClick={finishPath} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
                Finish Path
              </button>
              <button onClick={cancelPath} className="px-2 py-1 text-sm rounded-md border border-border text-text-muted">
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'position' && selectedIndex !== null && (
        <button
          onClick={() => setDiscHolder(selectedIndex)}
          className="px-2 py-1 text-sm rounded-md border border-border text-text self-start"
        >
          {currentStep.players[selectedIndex].hasDisc ? 'Has Disc ✓' : 'Set as Disc Holder'}
        </button>
      )}

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={isEndzone} onChange={(e) => setIsEndzone(e.target.checked)} />
        Endzone play
      </label>

      <div className="flex flex-col gap-1">
        {steps.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => goToStep(i)}
              className={`flex-1 text-left px-2 py-1 rounded-md border text-sm ${
                i === currentStepIndex ? 'border-accent text-accent' : 'border-border text-text'
              }`}
            >
              Step {i + 1}
            </button>
            {steps.length > 1 && (
              <button onClick={() => deleteStep(i)} className="text-xs text-text-muted hover:text-danger-border">
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={addStep} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
          + Add Step
        </button>
      </div>

      <SaveForm onSave={onSave} />
    </div>
  )
}

function SaveForm({ onSave }: { onSave: (name: string) => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
        if (input.value.trim()) onSave(input.value.trim())
      }}
    >
      <input
        name="name"
        placeholder="play-name"
        className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
      />
      <button type="submit" className="px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm">
        Save
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors. (Manual verification happens in Task 7, wired up alongside the canvas.)

- [ ] **Step 3: Commit**

```bash
git add src/components/designer/DesignerToolbar.tsx
git commit -m "feat: add control panel for the play designer"
```

---

### Task 7: Designer page

**Files:**
- Create: `src/app/designer/page.tsx`

**Interfaces:**
- Consumes: `useDesignerState` (Task 2), `DesignerCanvas` (Task 5), `DesignerToolbar` (Task 6), `POST /api/designer/save` (Task 4).

- [ ] **Step 1: Create the page**

```tsx
// src/app/designer/page.tsx
'use client'
import { useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  async function handleSave(name: string) {
    setSaveStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps: designer.steps }),
      })
      const data = await res.json()
      setSaveStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
    } catch {
      setSaveStatus('Error: failed to save')
    }
  }

  return (
    <main className="flex flex-col md:flex-row h-screen bg-bg">
      <div className="w-full md:w-[65%] h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <DesignerCanvas designer={designer} />
        </div>
      </div>
      <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 overflow-y-auto">
        <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Play Designer</h1>
        <DesignerToolbar designer={designer} onSave={handleSave} />
        {saveStatus && <p className="text-sm text-text-muted">{saveStatus}</p>}
      </aside>
    </main>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Full manual verification**

With the dev server running, load `http://localhost:3000/designer` and walk through the whole tool:

1. Confirm 14 tokens render in two rows (7 blue offense on top, 7 red defense below), labeled H1/H2/H3/C1/C2/C3/C4 for offense and D1-D7 (via `GENERIC_DEFENDER_LABELS`) for defense.
2. **Position mode**: drag a token, confirm it follows the pointer smoothly and stays where dropped. Click (no drag) a token, confirm a white selection ring appears and a "Set as Disc Holder" button appears in the toolbar; click it, confirm a small white dot appears offset from that token and toggling another token's disc status removes it from the first.
3. **Draw Path mode**: switch mode, pick a path type swatch, click a token, click two more spots on the field, click "Finish Path" — confirm a dashed line in the chosen color appears connecting those points. Start another path and click "Cancel" — confirm nothing is added.
4. **Mark Throw mode**: switch mode, click the current disc holder, then click a different token — no visual arc is expected here (that's the shipped viewer's job), but re-switch to Position mode and confirm no errors occurred (the `throw` field is set internally; there's no dedicated visual for it in the designer per the design doc's scope).
5. **Steps**: click "+ Add Step", confirm the new step shows the same token positions as the last step but with no paths. Drag a token in the new step, switch back to Step 1, confirm Step 1 is unaffected by the Step 2 edit.
6. **Endzone toggle**: check the box, confirm the field background switches to the endzone-band rendering (2/3 dark band at top) matching how `/plays/endzone-baby-iso` looks.
7. **Save**: type a name, click Save, confirm the status line shows `Saved to designer-output/<name>-<timestamp>.json`, and confirm that file exists in the repo with the expected JSON shape (array of steps, each with `players`/`pathPreviews`/optional `throw`).

Delete the test output file afterward (`rm designer-output/*.json`) since it's just verification scratch.

- [ ] **Step 4: Confirm the route isn't linked anywhere**

Run: `grep -rn "/designer" src/components/ src/app/plays/ 2>/dev/null` — expect no results (confirms nothing links to it from the shipped viewer).

- [ ] **Step 5: Commit**

```bash
git add src/app/designer/page.tsx
git commit -m "feat: add play designer page, wiring canvas, toolbar, and save"
```

---

## Self-Review Notes

- Every section of the design doc has a corresponding task: shared color map (Task 1), types + state (Task 2), draggable token (Task 3), save endpoint (Task 4), canvas (Task 5), toolbar (Task 6), page wiring (Task 7).
- Property names on `useDesignerState()`'s return object are used identically across Tasks 5, 6, and 7 (`setMode`, `selectToken`, `moveToken`, `startPath`, `addWaypoint`, `finishPath`, `cancelPath`, `setDiscHolder`, `setThrow`, `addStep`, `deleteStep`, `goToStep`, `setIsEndzone`, `setPathType`) — checked for drift between task drafts.
- No placeholder steps — every code block is complete and directly usable.
- Task 4 (API route) is ordered before Task 7 (page) despite being numbered after Tasks 5/6 in the dependency chain only because it has zero UI dependents of its own (curl-testable in isolation) — actual build order should be 1, 2, 3, 4, 5, 6, 7 as numbered, since 5 and 6 both depend on 1+2, and 7 depends on 2+4+5+6.
