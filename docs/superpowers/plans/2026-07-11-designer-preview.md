# Play Designer Preview Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only "Preview" mode to the in-app Play Designer that animates through the in-progress draft step by step (reusing the shipped play-viewer's animation components), pausing at branch points for a live choice, navigated with Prev/Next and a step indicator — no autoplay.

**Architecture:** Extract the designer's tree-walking helpers (`getStepAtPath`/`getSequenceAtPath`/`replaceStepAtPath`/`replaceSequenceAtPath`) out of `useDesignerState.ts` into a shared module so a new read-only preview component can reuse the read half without duplicating tree-walk logic. Narrow the shipped `Disc` component's prop type from the full `PlayStep` to the small structural shape it actually uses, so a `DesignerStep` (which has no `id`/`narrative`/`quiz`) can be adapted into it directly. Build one new self-contained `DesignerPreview` component with its own local navigation state (a `StepPath`, entirely separate from the editor's `currentPath`), rendering via the existing `FieldBackground`/`PathPreviews`/`PlayerToken`/`Disc` components. Wire a "Preview" button into the toolbar and a view toggle into the designer page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Framer Motion (already used by `PlayerToken`/`Disc` for position/throw tweening — reused unchanged). No automated tests — hobby project, explicit no-testing policy; verification is `npx tsc --noEmit` plus manual/Playwright exercise of the running app.

## Global Constraints

- No automated tests of any kind.
- Preview has no autoplay/timer — navigation is Prev/Next-button-driven only, confirmed with the user.
- At a branch point (`previewStep.branches` non-empty), Preview shows one button per branch (its `label`) instead of a Next button; choosing one animates into that branch's first step. This pause-and-choose behavior was explicitly confirmed with the user over the default of always following one path.
- Preview must not touch or reset the editor's own `currentPath`/`selectedIndex`/`mode` state — entering/exiting preview must leave the editor exactly as the user left it.
- `Disc`'s prop-type narrowing must not change its behavior for its existing caller (`FieldCanvas.tsx`, in the shipped play-viewer) — a full `PlayStep` must still satisfy the narrowed type with zero changes needed at that call site.

---

### Task 1: Extract shared step-path helpers; narrow `Disc`'s prop type

**Files:**
- Create: `src/lib/designerSteps.ts`
- Modify: `src/hooks/useDesignerState.ts:1-56` (remove the four local function definitions, import them instead)
- Modify: `src/components/field/Disc.tsx` (narrow the `step` prop's type)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `getStepAtPath(root: DesignerStep[], path: StepPath): DesignerStep`, `getSequenceAtPath(root: DesignerStep[], path: StepPath): DesignerStep[]`, `replaceStepAtPath(root, path, updater): DesignerStep[]`, `replaceSequenceAtPath(root, path, updater): DesignerStep[]`, all exported from `src/lib/designerSteps.ts`. Task 2's `DesignerPreview` imports `getStepAtPath`/`getSequenceAtPath` from this exact path. `Disc`'s narrowed prop type (`{ id: string; players: PlayerState[]; throw?: ThrowArc }`) is what Task 2 constructs to pass into it.

- [ ] **Step 1: Create the shared step-path helpers module**

Create `src/lib/designerSteps.ts` with exactly the four functions currently defined inline in `useDesignerState.ts` (moved verbatim, now exported):

```ts
import type { DesignerStep, StepPath } from '@/types/designer'

export function getStepAtPath(root: DesignerStep[], path: StepPath): DesignerStep {
  let steps = root
  let step = steps[path[0]]
  for (let i = 1; i < path.length; i += 2) {
    const branchIndex = path[i]
    const stepIndex = path[i + 1]
    steps = step.branches![branchIndex].steps
    step = steps[stepIndex]
  }
  return step
}

export function getSequenceAtPath(root: DesignerStep[], path: StepPath): DesignerStep[] {
  if (path.length === 1) return root
  const parentStep = getStepAtPath(root, path.slice(0, -2))
  const branchIndex = path[path.length - 2]
  return parentStep.branches![branchIndex].steps
}

export function replaceStepAtPath(root: DesignerStep[], path: StepPath, updater: (step: DesignerStep) => DesignerStep): DesignerStep[] {
  const stepIndex = path[path.length - 1]
  return replaceSequenceAtPath(root, path, (seq) => seq.map((s, i) => (i === stepIndex ? updater(s) : s)))
}

export function replaceSequenceAtPath(root: DesignerStep[], path: StepPath, updater: (seq: DesignerStep[]) => DesignerStep[]): DesignerStep[] {
  if (path.length === 1) return updater(root)
  const parentPath = path.slice(0, -2)
  const branchIndex = path[path.length - 2]
  return replaceStepAtPath(root, parentPath, (step) => ({
    ...step,
    branches: step.branches!.map((b, i) => (i === branchIndex ? { ...b, steps: updater(b.steps) } : b)),
  }))
}
```

- [ ] **Step 2: Update `useDesignerState.ts` to import these instead of defining them locally**

In `src/hooks/useDesignerState.ts`, the file currently starts like this (lines 1-56):

```ts
'use client'
import { useEffect, useState } from 'react'
import type { DesignerStep, DesignerBranch, DesignerMode, StepPath } from '@/types/designer'
import type { PlayerPath, Position, Play } from '@/types/play'

const OFFENSE_ORDER: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']
const AUTOSAVE_KEY = 'mousetrap-designer-autosave'

function defaultStep(): DesignerStep {
  return {
    players: [
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.4 })),
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.5, isDefense: true })),
    ],
    pathPreviews: [],
  }
}

function freshStepFrom(step: DesignerStep): DesignerStep {
  return { players: step.players.map((p) => ({ ...p })), pathPreviews: [] }
}

function getStepAtPath(root: DesignerStep[], path: StepPath): DesignerStep {
  let steps = root
  let step = steps[path[0]]
  for (let i = 1; i < path.length; i += 2) {
    const branchIndex = path[i]
    const stepIndex = path[i + 1]
    steps = step.branches![branchIndex].steps
    step = steps[stepIndex]
  }
  return step
}

function getSequenceAtPath(root: DesignerStep[], path: StepPath): DesignerStep[] {
  if (path.length === 1) return root
  const parentStep = getStepAtPath(root, path.slice(0, -2))
  const branchIndex = path[path.length - 2]
  return parentStep.branches![branchIndex].steps
}

function replaceStepAtPath(root: DesignerStep[], path: StepPath, updater: (step: DesignerStep) => DesignerStep): DesignerStep[] {
  const stepIndex = path[path.length - 1]
  return replaceSequenceAtPath(root, path, (seq) => seq.map((s, i) => (i === stepIndex ? updater(s) : s)))
}

function replaceSequenceAtPath(root: DesignerStep[], path: StepPath, updater: (seq: DesignerStep[]) => DesignerStep[]): DesignerStep[] {
  if (path.length === 1) return updater(root)
  const parentPath = path.slice(0, -2)
  const branchIndex = path[path.length - 2]
  return replaceStepAtPath(root, parentPath, (step) => ({
    ...step,
    branches: step.branches!.map((b, i) => (i === branchIndex ? { ...b, steps: updater(b.steps) } : b)),
  }))
}
```

Replace it with:

```ts
'use client'
import { useEffect, useState } from 'react'
import type { DesignerStep, DesignerBranch, DesignerMode, StepPath } from '@/types/designer'
import type { PlayerPath, Position, Play } from '@/types/play'
import { getStepAtPath, getSequenceAtPath, replaceStepAtPath, replaceSequenceAtPath } from '@/lib/designerSteps'

const OFFENSE_ORDER: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']
const AUTOSAVE_KEY = 'mousetrap-designer-autosave'

function defaultStep(): DesignerStep {
  return {
    players: [
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.4 })),
      ...OFFENSE_ORDER.map((id, i) => ({ id, x: 0.1 + i * 0.13, y: 0.5, isDefense: true })),
    ],
    pathPreviews: [],
  }
}

function freshStepFrom(step: DesignerStep): DesignerStep {
  return { players: step.players.map((p) => ({ ...p })), pathPreviews: [] }
}
```

The rest of the file (everything from `type InProgressPath = ...` onward) is unchanged — it already calls `getStepAtPath`/`getSequenceAtPath`/`replaceStepAtPath`/`replaceSequenceAtPath` by name, and those names now resolve to the imported versions instead of local ones, with identical behavior.

- [ ] **Step 3: Narrow `Disc`'s prop type**

Replace the full contents of `src/components/field/Disc.tsx`:

```tsx
'use client'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState, ThrowArc } from '@/types/play'

type DiscProps = {
  step: { id: string; players: PlayerState[]; throw?: ThrowArc }
  onThrowComplete?: () => void
}

export function Disc({ step, onThrowComplete }: DiscProps) {
  const holder = step.players.find((p) => p.hasDisc && !p.isDefense)
  if (!holder) return null

  if (step.throw) {
    const from = step.players.find((p) => p.id === step.throw!.from && !p.isDefense)
    const to = step.players.find((p) => p.id === step.throw!.to && !p.isDefense)
    if (from && to) {
      const start = toPixel(from.x, from.y)
      const end = toPixel(to.x, to.y)
      return (
        <motion.circle
          key={step.id}
          r={1.4}
          fill="white"
          initial={{ cx: start.px, cy: start.py }}
          animate={{ cx: end.px, cy: end.py }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          onAnimationComplete={onThrowComplete}
        />
      )
    }
  }

  const { px, py } = toPixel(holder.x, holder.y)
  return <circle r={1} fill="white" stroke="black" strokeWidth={0.2} cx={px + 2.4} cy={py - 2.4} />
}
```

The only change from before is the `DiscProps.step` type: it was `PlayStep` (from `@/types/play`), now it's the small structural shape actually used (`id`, `players`, `throw`). A real `PlayStep` already has all three fields, so `src/components/field/FieldCanvas.tsx` (the only existing caller) needs no changes at all — TypeScript's structural typing accepts it as-is.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `FieldCanvas.tsx` shows an error here, something in the narrowed type doesn't structurally match `PlayStep` — re-check the three field names/types against `src/types/play.ts`'s `PlayStep` and `PlayerState`/`ThrowArc` definitions.)

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `http://localhost:3000` and navigate into any existing play (or `/plays/[id]` for whatever play id exists). Confirm the disc still renders and animates on a throw exactly as before — this task changes only a type annotation, not runtime behavior, so this is a quick regression check, not new functionality.

- [ ] **Step 6: Commit**

```bash
git add src/lib/designerSteps.ts src/hooks/useDesignerState.ts src/components/field/Disc.tsx
git commit -m "refactor(designer): extract step-path helpers to a shared module; narrow Disc's prop type"
```

---

### Task 2: Build the `DesignerPreview` component

**Files:**
- Create: `src/components/designer/DesignerPreview.tsx`

**Interfaces:**
- Consumes: `getStepAtPath`, `getSequenceAtPath` from `@/lib/designerSteps` (Task 1); `Disc` from `@/components/field/Disc` with its narrowed prop type (Task 1); `FieldBackground`, `PathPreviews`, `PlayerToken` from `@/components/field/*` (unchanged, pre-existing); `GENERIC_DEFENDER_LABELS` from `@/lib/names`; `FIELD_WIDTH`, `FIELD_HEIGHT`, `toPixel` from `@/lib/field`; `DesignerStep`, `StepPath` from `@/types/designer`; `Play` from `@/types/play`.
- Produces: `DesignerPreview({ steps: DesignerStep[]; set: Play['set']; onExit: () => void })` — a self-contained component. Task 3 renders it in place of the editor view and passes `steps={designer.steps}`, `set={designer.set}`, `onExit={...}`.

- [ ] **Step 1: Create `DesignerPreview.tsx`**

Create `src/components/designer/DesignerPreview.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PathPreviews } from '@/components/field/PathPreviews'
import { PlayerToken } from '@/components/field/PlayerToken'
import { Disc } from '@/components/field/Disc'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { getStepAtPath, getSequenceAtPath } from '@/lib/designerSteps'
import type { DesignerStep, StepPath } from '@/types/designer'
import type { Play } from '@/types/play'

type DesignerPreviewProps = {
  steps: DesignerStep[]
  set: Play['set']
  onExit: () => void
}

function branchTrail(root: DesignerStep[], path: StepPath): string[] {
  const labels: string[] = []
  for (let i = 1; i < path.length; i += 2) {
    const parentStep = getStepAtPath(root, path.slice(0, i))
    labels.push(parentStep.branches![path[i]].label)
  }
  return labels
}

export function DesignerPreview({ steps, set, onExit }: DesignerPreviewProps) {
  const [previewPath, setPreviewPath] = useState<StepPath>([0])

  const previewStep = getStepAtPath(steps, previewPath)
  const sequence = getSequenceAtPath(steps, previewPath)
  const currentIndex = previewPath[previewPath.length - 1]
  const isBranchPoint = !!previewStep.branches && previewStep.branches.length > 0
  const hasNext = !isBranchPoint && currentIndex + 1 < sequence.length
  const canGoPrev = previewPath.length > 1 || currentIndex > 0
  const stepNumber = (previewPath.length + 1) / 2
  const trail = branchTrail(steps, previewPath)
  const showEndzone = set === 'endzone'

  function goNext() {
    if (!hasNext) return
    setPreviewPath([...previewPath.slice(0, -1), currentIndex + 1])
  }

  function goPrev() {
    if (!canGoPrev) return
    if (currentIndex > 0) {
      setPreviewPath([...previewPath.slice(0, -1), currentIndex - 1])
    } else {
      setPreviewPath(previewPath.slice(0, -2))
    }
  }

  function chooseBranch(branchIndex: number) {
    setPreviewPath([...previewPath, branchIndex, 0])
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Step {stepNumber}</p>
          {trail.length > 0 && (
            <p className="text-xs text-text-muted">via {trail.join(' → ')}</p>
          )}
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1 text-sm rounded-md border border-border text-text-muted hover:text-text"
        >
          Exit Preview
        </button>
      </div>

      <div className="relative flex-1 rounded-xl border border-border bg-surface overflow-hidden">
        <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full">
          <FieldBackground showEndzone={showEndzone} />
          <PathPreviews paths={previewStep.pathPreviews} />
          {previewStep.players.map((player, i) => {
            const label = player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id
            const path = !player.isDefense ? previewStep.pathPreviews.find((p) => p.playerId === player.id) : undefined
            const pathPoints = path?.points.map((pt) => toPixel(pt.x, pt.y))
            return (
              <PlayerToken
                key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
                player={player}
                isYou={false}
                dimmed={false}
                enterIndex={i}
                label={label}
                pathPoints={pathPoints}
              />
            )
          })}
          <Disc step={{ id: previewPath.join('-'), players: previewStep.players, throw: previewStep.throw }} />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="px-3 py-1 text-sm rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {isBranchPoint ? (
          <div className="flex flex-1 flex-wrap gap-2">
            {previewStep.branches!.map((branch, i) => (
              <button
                key={i}
                onClick={() => chooseBranch(i)}
                className="px-3 py-1 text-sm rounded-md border border-accent text-accent"
              >
                {branch.label}
              </button>
            ))}
          </div>
        ) : hasNext ? (
          <button
            onClick={goNext}
            className="px-3 py-1 text-sm rounded-md border border-accent bg-accent text-accent-foreground"
          >
            Next
          </button>
        ) : (
          <p className="flex-1 text-sm text-text-muted">End of play</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (component-level, not yet wired into the page)**

This component isn't reachable from the UI until Task 3 wires it in, so full manual verification happens there. For this task, confirm via `npx tsc --noEmit` cleanliness plus a careful read-through: trace `previewPath = [0]` through `getStepAtPath`/`getSequenceAtPath` by hand against the root `steps` array and confirm `hasNext`/`canGoPrev`/`stepNumber` compute the values described in the design spec (`docs/superpowers/specs/2026-07-11-designer-preview-design.md`) for a simple 3-step linear sequence and for a path with one branch hop.

- [ ] **Step 4: Commit**

```bash
git add src/components/designer/DesignerPreview.tsx
git commit -m "feat(designer): add DesignerPreview component (animated step-through with branch choices)"
```

---

### Task 3: Wire Preview into the toolbar and page

**Files:**
- Modify: `src/components/designer/DesignerToolbar.tsx`
- Modify: `src/app/designer/page.tsx`

**Interfaces:**
- Consumes: `DesignerPreview` from `@/components/designer/DesignerPreview` (Task 2).
- Produces: no further consumers — this is the last task.

- [ ] **Step 1: Add an `onPreview` prop to `DesignerToolbarProps` and render a Preview button**

In `src/components/designer/DesignerToolbar.tsx`, replace:

```ts
type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
  draftNames: string[]
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
}
```

with:

```ts
type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
  draftNames: string[]
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onPreview: () => void
}
```

Replace:

```tsx
export function DesignerToolbar({ designer, onSave, draftNames, onLoadDraft, onDeleteDraft }: DesignerToolbarProps) {
```

with:

```tsx
export function DesignerToolbar({ designer, onSave, draftNames, onLoadDraft, onDeleteDraft, onPreview }: DesignerToolbarProps) {
```

Replace the opening of the returned JSX:

```tsx
  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      <div className="flex gap-2">
        {MODES.map((m) => (
```

with:

```tsx
  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      <button
        onClick={onPreview}
        className="self-start px-3 py-1 text-sm rounded-md border border-accent text-accent"
      >
        ▶ Preview
      </button>

      <div className="flex gap-2">
        {MODES.map((m) => (
```

- [ ] **Step 2: Add the preview toggle to the designer page**

Replace the full contents of `src/app/designer/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'
import { DesignerPreview } from '@/components/designer/DesignerPreview'
import type { Play } from '@/types/play'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [status, setStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)

  async function refreshDrafts() {
    try {
      const res = await fetch('/api/designer/drafts')
      const data = await res.json()
      setDraftNames(Array.isArray(data.drafts) ? data.drafts : [])
    } catch {
      setDraftNames([])
    }
  }

  useEffect(() => {
    refreshDrafts()
  }, [])

  async function handleSave(name: string) {
    setStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: designer.category, set: designer.set, steps: designer.steps }),
      })
      const data = await res.json()
      setStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
      if (res.ok) refreshDrafts()
    } catch {
      setStatus('Error: failed to save')
    }
  }

  async function handleLoadDraft(name: string) {
    if (!window.confirm(`Load "${name}"? This will replace your current in-progress work.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`)
      const data = await res.json()
      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }
      const applied = designer.loadDraft(data as { category?: Play['category']; set?: Play['set']; steps?: unknown })
      setStatus(applied ? `Loaded ${name}` : `Error: "${name}" is not a valid draft file`)
    } catch {
      setStatus('Error: failed to load draft')
    }
  }

  async function handleDeleteDraft(name: string) {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`, { method: 'DELETE' })
      const data = await res.json()
      setStatus(res.ok ? `Deleted ${name}` : `Error: ${data.error}`)
      refreshDrafts()
    } catch {
      setStatus('Error: failed to delete draft')
    }
  }

  if (isPreviewing) {
    return (
      <main className="flex h-screen bg-bg p-4">
        <DesignerPreview steps={designer.steps} set={designer.set} onExit={() => setIsPreviewing(false)} />
      </main>
    )
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
        <DesignerToolbar
          designer={designer}
          onSave={handleSave}
          draftNames={draftNames}
          onLoadDraft={handleLoadDraft}
          onDeleteDraft={handleDeleteDraft}
          onPreview={() => setIsPreviewing(true)}
        />
        {status && <p className="text-sm text-text-muted">{status}</p>}
      </aside>
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. Build at least a 3-step sequence with a path drawn for at least one player on one step, and a throw marked on another step, so the preview has something to animate.
2. Add a branch at some step (two labeled branches).
3. Click "▶ Preview" — confirm the editor view is replaced by the preview view showing "Step 1".
4. Click Next repeatedly through the steps before the branch point; confirm players visibly animate (not snap) between steps, including along any drawn path, and the disc animates on the throw step.
5. Reach the branch step; confirm Next is replaced by two labeled buttons (not a generic "Next"); click one; confirm it animates into that branch's first step and the step indicator shows "Step 2" (or whatever the correct hop count is) with a "via {label}" line underneath.
6. Click Prev repeatedly all the way back to Step 1; confirm each click animates backward and Prev becomes disabled at Step 1.
7. Click "Exit Preview"; confirm you're back in the normal editor with the step tree, canvas, and toolbar exactly as they were (no reset of `currentPath`/selection/mode).
8. Confirm no console errors throughout.

- [ ] **Step 5: Commit**

```bash
git add src/components/designer/DesignerToolbar.tsx src/app/designer/page.tsx
git commit -m "feat(designer): wire Preview button and view toggle into the designer page"
```

---

## Self-Review Notes

- **Spec coverage:** Branch-point pause-and-choose (Task 2's `isBranchPoint`/`chooseBranch`) ✅. No-autoplay, Prev/Next + step indicator (Task 2's UI, no timers anywhere) ✅. Reuse of shipped viewer components rather than rebuilding (`FieldBackground`/`PathPreviews`/`PlayerToken`/`Disc` all imported, not duplicated) ✅. Editor state untouched by preview (Task 2's `previewPath` is fully local `useState`, never reads/writes `designer.currentPath` etc.) ✅. `Disc` reuse without breaking the real viewer (Task 1's narrowing is structural-only, `FieldCanvas.tsx` untouched) ✅.
- **Placeholder scan:** No TBD/TODO; every step has complete code.
- **Type consistency:** `DesignerPreviewProps` (`steps`, `set`, `onExit`) defined once in Task 2, consumed identically in Task 3's `page.tsx`. `Disc`'s narrowed `step` prop shape is defined once in Task 1 and constructed identically in Task 2. `getStepAtPath`/`getSequenceAtPath` signatures match between their Task 1 definition and Task 2's usage.
