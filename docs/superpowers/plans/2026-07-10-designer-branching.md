# Designer Branching Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the play designer's steps form a tree instead of a flat array, so a step can fork into 2+ labeled branches (each with its own independent step sequence, which can itself branch again), while preserving whatever continuation already existed at that point as the first branch.

**Architecture:** `DesignerStep` gains an optional `branches: DesignerBranch[]`. "Current position" changes from a single array index to a **path** (`number[]`, alternating step-index/branch-index). Four small pure functions in `useDesignerState.ts` do all path resolution and immutable tree updates. The toolbar's step list becomes a recursive indented tree. `DesignerCanvas.tsx`, `src/app/designer/page.tsx`, and the save API route are **not touched** — they only ever operate on "the current step" or "the whole step tree," neither of which changed shape in a way that affects them.

**Tech Stack:** Next.js App Router, React 19, TypeScript (unchanged from the existing designer).

## Global Constraints

- **No automated tests, ever** — project-wide policy. Verification is `npx tsc --noEmit` plus manual/traced verification as each task describes.
- **Branches never rejoin** — every branch is an independent tree; there is no way to point a branch at an already-existing step elsewhere in the tree. Do not build any UI or data path for this.
- **No auto-collapse** when a branch is removed and only one remains — this is allowed and intentionally left as-is, not treated as a bug.
- **Do not modify** `src/components/designer/DesignerCanvas.tsx`, `src/app/designer/page.tsx`, or `src/app/api/designer/save/route.ts` — none of them need to change for this feature (confirmed by inspection: they consume `currentStep`, `mode`, `selectedIndex`, and the top-level `steps` array, none of which change shape or name).
- **Preserve every existing hook property name** except `currentStepIndex`, which is removed and replaced by `currentPath: StepPath`. `deleteStep` and `goToStep` change signature from taking a plain `number` to taking a `StepPath` (`number[]`) — the only caller of either (the toolbar) is updated in the same task that changes the toolbar.
- Reuse existing Tailwind theme tokens only (same list as the original designer plan): `border-border`, `bg-surface`, `bg-bg`, `text-text`, `text-text-muted`, `text-accent`, `border-accent`, `bg-accent`, `text-accent-foreground`, `text-danger-border`.

---

### Task 1: Designer types

**Files:**
- Modify: `src/types/designer.ts`

**Interfaces:**
- Produces: `DesignerBranch`, updated `DesignerStep` (with optional `branches`), and `StepPath` — consumed by Task 2 (`useDesignerState.ts`) and Task 3 (`DesignerToolbar.tsx`).

- [ ] **Step 1: Update the file**

Read the current file first (`src/types/designer.ts`), then replace its contents with:

```ts
import type { PlayerState, PlayerPath, ThrowArc } from './play'

export type DesignerBranch = {
  label: string
  steps: DesignerStep[]
}

export type DesignerStep = {
  players: PlayerState[]
  pathPreviews: PlayerPath[]
  throw?: ThrowArc
  branches?: DesignerBranch[]
}

export type DesignerMode = 'position' | 'path' | 'throw'

export type StepPath = number[]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`. This will show errors in `useDesignerState.ts` and `DesignerToolbar.tsx` at this point (they still reference the old shape) — that's expected and resolved by Tasks 2 and 3. Confirm the *only* errors are in those two files (nothing else references `DesignerStep`/`DesignerMode` — `DesignerCanvas.tsx` only imports the `useDesignerState` return type, not `DesignerStep` directly, so it should show no errors from this change alone).

- [ ] **Step 3: Commit**

```bash
git add src/types/designer.ts
git commit -m "feat: add branch types for the play designer"
```

---

### Task 2: State hook — path-based navigation and branch actions

**Files:**
- Modify: `src/hooks/useDesignerState.ts`

**Interfaces:**
- Consumes: `DesignerStep`, `DesignerBranch`, `DesignerMode`, `StepPath` from `@/types/designer` (Task 1).
- Produces: the hook's new return shape, consumed by Task 3 (`DesignerToolbar.tsx`). Property changes from the current hook: `currentStepIndex` **removed**; `currentPath: StepPath` **added**. `deleteStep(path: StepPath)` and `goToStep(path: StepPath)` **change signature** (previously took `number`). **New**: `addBranch(label1: string, label2: string): void`, `addAnotherBranch(label: string): void`, `removeBranch(stepPath: StepPath, branchIndex: number): void`. Everything else (`steps`, `currentStep`, `mode`, `setMode`, `selectedIndex`, `selectToken`, `pathType`, `setPathType`, `inProgressPath`, `category`, `setCategory`, `set`, `setSet`, `moveToken`, `startPath`, `addWaypoint`, `finishPath`, `cancelPath`, `setDiscHolder`, `setThrow`, `addStep`) keeps its exact name and behavior from the consuming components' point of view — only how "current step" is looked up internally changes.

- [ ] **Step 1: Replace the file's contents**

Read the current file first (`src/hooks/useDesignerState.ts`), then replace its entire contents with:

```ts
'use client'
import { useState } from 'react'
import type { DesignerStep, DesignerBranch, DesignerMode, StepPath } from '@/types/designer'
import type { PlayerPath, Position, Play } from '@/types/play'

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

type InProgressPath = { playerIndex: number; points: { x: number; y: number }[] }

export function useDesignerState() {
  const [rootSteps, setRootSteps] = useState<DesignerStep[]>([defaultStep()])
  const [currentPath, setCurrentPath] = useState<StepPath>([0])
  const [modeState, setModeState] = useState<DesignerMode>('position')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [pathType, setPathType] = useState<PlayerPath['type']>('primary')
  const [inProgressPath, setInProgressPath] = useState<InProgressPath | null>(null)
  const [category, setCategory] = useState<Play['category']>('offense')
  const [set, setSet] = useState<Play['set']>('ho-stack')

  const currentStep = getStepAtPath(rootSteps, currentPath)

  function updateCurrentStep(updater: (step: DesignerStep) => DesignerStep) {
    setRootSteps((prev) => replaceStepAtPath(prev, currentPath, updater))
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
    updateCurrentStep((step) => ({
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
    updateCurrentStep((step) => ({
      ...step,
      pathPreviews: [...step.pathPreviews.filter((p) => p.playerId !== player.id), newPath],
    }))
    setInProgressPath(null)
  }

  function cancelPath() {
    setInProgressPath(null)
  }

  function setDiscHolder(index: number) {
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p, i) => ({ ...p, hasDisc: i === index })),
    }))
  }

  function setThrow(fromIndex: number, toIndex: number) {
    const from = currentStep.players[fromIndex]
    const to = currentStep.players[toIndex]
    updateCurrentStep((step) => ({ ...step, throw: { from: from.id, to: to.id } }))
  }

  function addStep() {
    const duplicated = freshStepFrom(currentStep)
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const newIndex = sequence.length
    setRootSteps((prev) => replaceSequenceAtPath(prev, currentPath, (seq) => [...seq, duplicated]))
    setCurrentPath([...currentPath.slice(0, -1), newIndex])
    setSelectedIndex(null)
  }

  function deleteStep(path: StepPath) {
    const sequence = getSequenceAtPath(rootSteps, path)
    if (sequence.length <= 1) return
    const indexToDelete = path[path.length - 1]
    setRootSteps((prev) => replaceSequenceAtPath(prev, path, (seq) => seq.filter((_, i) => i !== indexToDelete)))
    setCurrentPath([0])
    setSelectedIndex(null)
  }

  function goToStep(path: StepPath) {
    setCurrentPath(path)
    setSelectedIndex(null)
  }

  function addBranch(label1: string, label2: string) {
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const currentIndex = currentPath[currentPath.length - 1]
    const remainder = sequence.slice(currentIndex + 1)
    const branch1Steps = remainder.length > 0 ? remainder : [freshStepFrom(currentStep)]
    const branch2Steps = [freshStepFrom(currentStep)]

    setRootSteps((prev) => {
      const truncated = replaceSequenceAtPath(prev, currentPath, (seq) => seq.slice(0, currentIndex + 1))
      return replaceStepAtPath(truncated, currentPath, (step) => ({
        ...step,
        branches: [
          { label: label1, steps: branch1Steps },
          { label: label2, steps: branch2Steps },
        ],
      }))
    })
    setCurrentPath([...currentPath, 1, 0])
    setSelectedIndex(null)
  }

  function addAnotherBranch(label: string) {
    const newBranch: DesignerBranch = { label, steps: [freshStepFrom(currentStep)] }
    const newBranches = [...(currentStep.branches ?? []), newBranch]
    const newBranchIndex = newBranches.length - 1
    setRootSteps((prev) => replaceStepAtPath(prev, currentPath, (step) => ({ ...step, branches: newBranches })))
    setCurrentPath([...currentPath, newBranchIndex, 0])
    setSelectedIndex(null)
  }

  function removeBranch(stepPath: StepPath, branchIndex: number) {
    const step = getStepAtPath(rootSteps, stepPath)
    if (!step.branches) return
    const newBranches = step.branches.filter((_, i) => i !== branchIndex)
    setRootSteps((prev) => replaceStepAtPath(prev, stepPath, (s) => ({
      ...s,
      branches: newBranches.length > 0 ? newBranches : undefined,
    })))
    setCurrentPath([0])
    setSelectedIndex(null)
  }

  return {
    steps: rootSteps,
    currentPath,
    currentStep,
    mode: modeState,
    setMode,
    selectedIndex,
    selectToken,
    pathType,
    setPathType,
    inProgressPath,
    category,
    setCategory,
    set,
    setSet,
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
    addBranch,
    addAnotherBranch,
    removeBranch,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`. This should now show errors only in `DesignerToolbar.tsx` (it still uses the old `currentStepIndex`/`goToStep(number)`/`deleteStep(number)` shape — resolved in Task 3). No errors should appear in `useDesignerState.ts`, `DesignerCanvas.tsx`, `src/app/designer/page.tsx`, or the API route.

- [ ] **Step 3: Hand-trace the four path-resolution functions**

There's no UI to click through yet (Task 3 rewires the toolbar). Instead, verify correctness by tracing these functions by hand against the code you just wrote, using these exact examples (write your trace results into your report — don't just assert "looks right," show the intermediate values):

1. `getStepAtPath(root, [2])` should equal `root[2]`.
2. `getStepAtPath(root, [2, 1, 0])` should equal `root[2].branches[1].steps[0]`.
3. `getSequenceAtPath(root, [2])` should equal `root` itself (the same array reference).
4. `getSequenceAtPath(root, [2, 1, 0])` should equal `root[2].branches[1].steps` (the same array reference as what's inside `root[2].branches[1]`).
5. `replaceStepAtPath(root, [2], (s) => ({...s, players: []}))` should return a **new** root array where index 2 has `players: []` and every other index is `===` (reference-equal) to the original `root`'s corresponding entry (confirming the update didn't touch unrelated siblings).
6. `replaceStepAtPath(root, [2, 1, 0], (s) => ({...s, players: []}))` should return a new root array where `result[2].branches[1].steps[0].players` is `[]`, `result[2].branches[1].steps[0]` is the only step that changed inside that branch, `result[2].branches[0]` (the *other* branch) is `===` reference-equal to the original, and `result[0]`/`result[1]` (siblings of `root[2]` at the root level) are `===` reference-equal to the originals.

If any trace doesn't match, fix the function before moving on — do not defer a wrong trace result to Task 3's review.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDesignerState.ts
git commit -m "feat: rework designer state as a step tree with branch support"
```

---

### Task 3: Toolbar — branch UI and tree navigation

**Files:**
- Modify: `src/components/designer/DesignerToolbar.tsx`

**Interfaces:**
- Consumes: the full new `useDesignerState()` return shape (Task 2), `DesignerStep`/`StepPath` types (Task 1).

- [ ] **Step 1: Replace the file's contents**

Read the current file first (`src/components/designer/DesignerToolbar.tsx`), then replace its entire contents with:

```tsx
'use client'
import { useState } from 'react'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { PlayerPath } from '@/types/play'
import type { DesignerMode, DesignerStep, StepPath } from '@/types/designer'
import { PATH_COLOR } from '@/lib/pathColors'
import { CATEGORY_LABELS, SET_LABELS, ALL_CATEGORIES, ALL_SETS } from '@/lib/playLabels'

type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
}

const PATH_TYPES: PlayerPath['type'][] = ['primary', 'secondary', 'clear', 'reset']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', path: 'Draw Path', throw: 'Mark Throw' }
const MODES: DesignerMode[] = ['position', 'path', 'throw']

export function DesignerToolbar({ designer, onSave }: DesignerToolbarProps) {
  const {
    steps, currentPath, currentStep, mode, setMode, selectedIndex,
    pathType, setPathType, inProgressPath, finishPath, cancelPath,
    setDiscHolder, addStep, deleteStep, goToStep, category, setCategory, set, setSet,
    addBranch, addAnotherBranch, removeBranch,
  } = designer

  const isBranchPoint = !!currentStep.branches && currentStep.branches.length > 0

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

      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={set}
          onChange={(e) => setSet(e.target.value as typeof set)}
          className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
        >
          {ALL_SETS.map((s) => (
            <option key={s} value={s}>{SET_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <StepTree
          steps={steps}
          pathPrefix={[]}
          currentPath={currentPath}
          onSelect={goToStep}
          onDelete={deleteStep}
          onRemoveBranch={removeBranch}
          depth={0}
        />
        {!isBranchPoint && (
          <button onClick={addStep} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
            + Add Step
          </button>
        )}
        {!isBranchPoint && <AddBranchForm onAdd={addBranch} />}
        {isBranchPoint && <AddAnotherBranchForm onAdd={addAnotherBranch} />}
      </div>

      <SaveForm onSave={onSave} />
    </div>
  )
}

function StepTree({
  steps, pathPrefix, currentPath, onSelect, onDelete, onRemoveBranch, depth,
}: {
  steps: DesignerStep[]
  pathPrefix: StepPath
  currentPath: StepPath
  onSelect: (path: StepPath) => void
  onDelete: (path: StepPath) => void
  onRemoveBranch: (stepPath: StepPath, branchIndex: number) => void
  depth: number
}) {
  return (
    <div className="flex flex-col gap-1" style={{ marginLeft: depth * 12 }}>
      {steps.map((step, i) => {
        const path = [...pathPrefix, i]
        const isCurrent = path.length === currentPath.length && path.every((v, idx) => v === currentPath[idx])
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelect(path)}
                className={`flex-1 text-left px-2 py-1 rounded-md border text-sm ${
                  isCurrent ? 'border-accent text-accent' : 'border-border text-text'
                }`}
              >
                Step {i + 1}
              </button>
              {steps.length > 1 && (
                <button onClick={() => onDelete(path)} className="text-xs text-text-muted hover:text-danger-border">
                  Remove
                </button>
              )}
            </div>
            {step.branches?.map((branch, b) => (
              <div key={b} className="flex flex-col gap-1" style={{ marginLeft: 12 }}>
                <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wide">
                  <span>{branch.label}</span>
                  <button onClick={() => onRemoveBranch(path, b)} className="hover:text-danger-border normal-case">
                    Remove Branch
                  </button>
                </div>
                <StepTree
                  steps={branch.steps}
                  pathPrefix={[...path, b]}
                  currentPath={currentPath}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRemoveBranch={onRemoveBranch}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AddBranchForm({ onAdd }: { onAdd: (label1: string, label2: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
        Add Branch
      </button>
    )
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const label1 = (form.elements.namedItem('label1') as HTMLInputElement).value.trim()
        const label2 = (form.elements.namedItem('label2') as HTMLInputElement).value.trim()
        if (label1 && label2) {
          onAdd(label1, label2)
          setOpen(false)
        }
      }}
    >
      <input name="label1" placeholder="Branch 1 label (e.g. existing continuation)" className="px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <input name="label2" placeholder="Branch 2 label (new alternative)" className="px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <div className="flex gap-2">
        <button type="submit" className="px-2 py-1 text-sm rounded-md border border-accent text-accent">Create Branches</button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-1 text-sm rounded-md border border-border text-text-muted">Cancel</button>
      </div>
    </form>
  )
}

function AddAnotherBranchForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
        + Add Another Branch
      </button>
    )
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('label') as HTMLInputElement
        if (input.value.trim()) {
          onAdd(input.value.trim())
          setOpen(false)
        }
      }}
    >
      <input name="label" placeholder="Branch label" className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <button type="submit" className="px-2 py-1 text-sm rounded-md border border-accent text-accent">Add</button>
    </form>
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

Run: `npx tsc --noEmit` — expect no errors anywhere in the project now.

- [ ] **Step 3: Full manual verification**

With the dev server running, load `http://localhost:3000/designer` and walk through this whole sequence (use Playwright if available, or drive a real browser another way):

1. Confirm the initial single step renders exactly as before (14 tokens, no branch UI visible — "Add Branch" button present since there's exactly one step and it's not a branch point).
2. Click "+ Add Step" twice, so there are 3 steps in a row. Confirm the step list shows "Step 1", "Step 2", "Step 3". On Step 3 specifically, drag one token to a clearly distinctive spot (e.g. the far corner) so you have a marker to check for later. Confirm clicking Step 1/2/3 in the list switches the canvas to each one's own positions.
3. Navigate to Step 2 (the middle one, so there's an existing continuation — Step 3 with your marker — after it). Click "Add Branch", fill in two labels (e.g. "Continue" and "Alternate"), submit. Confirm: the tree now shows Step 2 with two branches nested under it; clicking into the first branch's ("Continue") single step shows your distinctive marker token still in its far-corner spot, confirming the pre-existing Step 3 became this branch's content rather than being lost; the second branch ("Alternate") contains one fresh step with Step 2's original positions duplicated (no marker token, since this branch never existed before), and the view has switched to that fresh step after creation.
4. Add a second alternate: navigate back to the Step 2 branch point, click "+ Add Another Branch", give it a label, confirm a third branch appears in the tree alongside the first two.
5. Navigate into one of the branches' steps and add a nested branch there (click "Add Branch" on a step that's already inside a branch) — confirm the tree shows correctly indented nested branches.
6. Delete a branch via its "Remove Branch" link — confirm it and its whole sub-tree disappear from the list, and the current view resets to Step 1 (per the plan's simplified navigation-reset behavior).
7. Delete a plain step via its row's "Remove" button — confirm it disappears and the list re-numbers correctly.
8. Set a category/set, save with a name, and confirm the downloaded/written JSON (`designer-output/<name>-*.json`) contains a `steps` array with the expected nested `branches` structure matching what you built. Delete the test output file afterward.

Report exactly what you observed at each numbered point — not just "works as expected."

- [ ] **Step 4: Commit**

```bash
git add src/components/designer/DesignerToolbar.tsx
git commit -m "feat: add branch creation, navigation, and deletion to the designer toolbar"
```

---

## Self-Review Notes

- Every part of the design spec has a corresponding task: types (Task 1), state/path-resolution logic (Task 2), UI (Task 3).
- Confirmed `DesignerCanvas.tsx`, `src/app/designer/page.tsx`, and the API route need no changes by re-reading each against the new hook's return shape — all the properties they destructure (`currentStep`, `mode`, `selectedIndex`, `selectToken`, `moveToken`, `inProgressPath`, `startPath`, `addWaypoint`, `setThrow`, `set`, `pathType`, `steps`, `category`) are unchanged in name and meaning.
- Hand-traced all four path-resolution functions myself against the six example cases in Task 2 Step 3 before finalizing this plan — they resolve correctly, including the mutual recursion between `replaceStepAtPath` and `replaceSequenceAtPath` terminating properly (each round trip shortens the path by exactly 2 elements).
- No placeholders — every code block is complete and directly usable.
