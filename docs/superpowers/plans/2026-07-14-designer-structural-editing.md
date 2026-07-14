# Designer Structural Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Play Designer a real editor of *existing* plays — insert and reorder steps anywhere in a sequence, make Add Branch's downstream-preservation visible, and let an upstream position edit propagate forward through the steps that were merely carrying it. See the design doc: `docs/superpowers/specs/2026-07-14-designer-structural-editing-design.md`.

**Architecture:** All structural edits operate on the in-memory nested `DesignerStep` tree through the existing immutable helpers in `src/lib/designerSteps.ts`; the flat-model branch-contiguity convention is a publish-time concern and does not constrain in-tree edits. New pure functions live in `designerSteps.ts`; new actions live in `useDesignerState.ts`; the step tree and branch form gain controls; the designer page renders a propagation banner. Nothing in `components/field/`, the Viewer, the persisted types, or the API routes changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4 (unchanged).

## Global Constraints

- **No automated tests, ever** — project policy. Verification is `npx tsc --noEmit` plus the manual/traced steps each task describes.
- **The branch-point-is-last invariant** (see design doc) must hold: a plain step may never sit after a branch-point step in the same sequence. Enforced by disabling insert-below and the relevant reorders on branch-point steps.
- **Propagation is positions-only** and uses **exact float equality** against a pre-edit baseline (justified in the design doc — `addStep` deep-copies coords, so parked players are byte-identical). Do not add epsilon tolerance. Do not touch `hasDisc`, `throw`, `pathPreviews`, or `narrative`.
- **Undo discipline:** every content mutation calls `pushHistory()` first; the whole propagation cascade is one entry. Reuse the existing `beginDrag`/`endDrag` machinery — do not add a second history mechanism.
- **Editing convention deviation from earlier plans:** several target files (`useDesignerState.ts`, `StepTree.tsx`, `DesignerSidePanel.tsx`, `MobileStepSheet.tsx`, `designer/page.tsx`) are large and already evolved past the branching-era plans. This plan gives **exact additive code and precisely located edits** rather than pasting entire file contents. Read each file first, apply the described edit, and re-read the surrounding code to confirm it fits.
- Reuse existing theme tokens only (`border-border`, `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-accent`, `border-accent`, `bg-accent`, `text-accent-foreground`, `success-border`, `danger-border`).

---

### Task 1: Pure tree helpers — `countStepsAfter` and `propagateFromPath`

**Files:**
- Modify: `src/lib/designerSteps.ts`

**Interfaces:**
- Produces: `countStepsAfter(root, path): number` and `propagateFromPath(root, path, before): [DesignerStep[], number]` — consumed by Task 2 (`useDesignerState.ts`) and Task 4 (branch form count).

- [ ] **Step 1: Append the new code**

Read `src/lib/designerSteps.ts` first (it currently exports `getStepAtPath`, `getSequenceAtPath`, `replaceStepAtPath`, `replaceSequenceAtPath`). Add at the top an import for `PlayerState`, and append the following:

```ts
import type { DesignerStep, StepPath } from '@/types/designer'
import type { PlayerState } from '@/types/play'   // add to existing imports

// ...existing four helpers unchanged...

// Number of steps that follow the step at `path` within its own sequence.
// Used by the Add Branch form to tell the user how many steps will move onto
// the first branch.
export function countStepsAfter(root: DesignerStep[], path: StepPath): number {
  const seq = getSequenceAtPath(root, path)
  const idx = path[path.length - 1]
  return seq.length - idx - 1
}

// --- Downstream position propagation -----------------------------------------

type Elig = Map<string, { ox: number; oy: number; nx: number; ny: number }>

function playerKey(p: { id: string; isDefense?: boolean }): string {
  return `${p.id}:${p.isDefense ? 'd' : 'o'}`
}

function stepHasPathFor(step: DesignerStep, key: string): boolean {
  return step.pathPreviews.some(
    (pp) => `${pp.playerId}:${pp.isDefense ? 'd' : 'o'}` === key,
  )
}

// Walks one sequence from `startIndex`, applying each still-eligible player's
// new position to every step where that player is "parked" (exactly at their
// baseline position AND has no path of their own on that step). The first step
// where a player is NOT parked stops propagation for that player on this path.
// Eligibility forks into each branch (a fresh copy per branch), so a player can
// diverge in one branch yet keep propagating in another. Returns the rebuilt
// sequence and the count of steps actually changed.
function applyToSequence(seq: DesignerStep[], startIndex: number, eligible: Elig): [DesignerStep[], number] {
  const elig: Elig = new Map(eligible)
  let changed = 0
  const out = seq.map((step, i) => {
    if (i < startIndex) return step
    let stepChanged = false
    const players = step.players.map((p) => {
      const e = elig.get(playerKey(p))
      if (!e) return p
      const parked = p.x === e.ox && p.y === e.oy && !stepHasPathFor(step, playerKey(p))
      if (parked) {
        stepChanged = true
        return { ...p, x: e.nx, y: e.ny }
      }
      elig.delete(playerKey(p)) // diverged or absent → stop this player on this path
      return p
    })
    let newStep = stepChanged ? { ...step, players } : step
    if (stepChanged) changed++
    if (newStep.branches && newStep.branches.length > 0) {
      newStep = {
        ...newStep,
        branches: newStep.branches.map((b) => {
          const [bSteps, bChanged] = applyToSequence(b.steps, 0, elig)
          changed += bChanged
          return bChanged > 0 ? { ...b, steps: bSteps } : b
        }),
      }
      // Branch point is terminal for the linear scan (invariant: nothing
      // follows it in this sequence), so no further iteration matters here.
    }
    return newStep
  })
  return [out, changed]
}

// Propagates the position changes made to the step at `path` (diffed against
// `before`, its players prior to the edit) forward through every step reachable
// after it. Returns the rebuilt root tree and the number of steps changed;
// returns [root, 0] (same reference) when nothing moved or nothing propagates.
export function propagateFromPath(
  root: DesignerStep[],
  path: StepPath,
  before: PlayerState[],
): [DesignerStep[], number] {
  const edited = getStepAtPath(root, path)
  const elig: Elig = new Map()
  for (const p of edited.players) {
    const b = before.find((bp) => playerKey(bp) === playerKey(p))
    if (b && (b.x !== p.x || b.y !== p.y)) {
      elig.set(playerKey(p), { ox: b.x, oy: b.y, nx: p.x, ny: p.y })
    }
  }
  if (elig.size === 0) return [root, 0]

  if (edited.branches && edited.branches.length > 0) {
    let changed = 0
    const newRoot = replaceStepAtPath(root, path, (s) => ({
      ...s,
      branches: s.branches!.map((b) => {
        const [bSteps, bChanged] = applyToSequence(b.steps, 0, new Map(elig))
        changed += bChanged
        return bChanged > 0 ? { ...b, steps: bSteps } : b
      }),
    }))
    return changed > 0 ? [newRoot, changed] : [root, 0]
  }

  const seq = getSequenceAtPath(root, path)
  const idx = path[path.length - 1]
  const [newSeq, changed] = applyToSequence(seq, idx + 1, elig)
  if (changed === 0) return [root, 0]
  return [replaceSequenceAtPath(root, path, () => newSeq), changed]
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`. Expect no errors (this task is purely additive).

- [ ] **Step 3: Hand-trace propagation** (no UI yet). Trace `propagateFromPath` against a small literal tree and write the intermediate values into your report — do not just assert "looks right":
  1. Linear `root` of 4 steps; player `C3` at `{0.1,0.1}` in steps 0–3, no paths. `before` = step 0's players; edit step 0's `C3` to `{0.9,0.9}`. Call `propagateFromPath(root, [0], before)` → confirm result changes `C3` to `{0.9,0.9}` in steps 1,2,3 and `count === 3`.
  2. Same tree but step 2 gives `C3` a `pathPreview`. Confirm propagation updates steps 1 (parked) and **stops before step 2** (C3 has a path there) — `count === 1`, and steps 2,3 keep the old `C3` position.
  3. Branch case: step 0 forks into branch A (2 parked steps) and branch B (step 0 parked, step 1 gives `C3` a path). Confirm branch A gets 2 updates, branch B gets 1, `count === 3`, and the two branches are independent.

- [ ] **Step 4: Commit**
```bash
git add src/lib/designerSteps.ts
git commit -m "feat: add countStepsAfter and downstream position propagation helpers"
```

---

### Task 2: Hook actions — insert, reorder, and the propagation lifecycle

**Files:**
- Modify: `src/hooks/useDesignerState.ts`

**Interfaces:**
- Consumes: `countStepsAfter`, `propagateFromPath` (Task 1).
- Produces (new returned members): `insertStep(path: StepPath, position: 'above' | 'below')`, `moveStep(path: StepPath, direction: 'up' | 'down')`, `pendingPropagate` (the `PendingPropagate` object or `null`), `applyPropagate()`, `dismissPropagate()`. All existing members keep their names and behavior.

- [ ] **Step 1: Imports & state**

In the import from `@/lib/designerSteps`, add `countStepsAfter` and `propagateFromPath`. Also ensure `PlayerState` is imported from `@/types/play`.

Add the transient state (near the other `useState` calls):
```ts
type PendingPropagate = {
  path: StepPath
  before: PlayerState[]
  affectedStepCount: number
  movedPlayerLabels: string[]
} | null

const [pendingPropagate, setPendingPropagate] = useState<PendingPropagate>(null)
```

- [ ] **Step 2: Clear the prompt on unrelated changes**

Add `setPendingPropagate(null)` inside **`pushHistory()`** and inside **`applySnapshot()`** (so any new discrete mutation, and any undo/redo, dismisses a stale prompt). Also add it to `newPlay`, `loadDraft`, and `loadExistingPlay` (they already reset lots of state — add one more line each).

- [ ] **Step 3: Extend `endDrag`**

`endDrag` currently commits `dragSnapshotRef.current` to the undo stack and clears the ref. Extend it so that, for a position/select drag that moved someone on a step with reachable descendants, it computes a dry run and arms the prompt. Replace the body of `endDrag` with:

```ts
function endDrag() {
  const snap = dragSnapshotRef.current
  if (!snap) return
  setUndoStack([...undoStack, snap])
  setRedoStack([])
  dragSnapshotRef.current = null

  if (modeState !== 'position' && modeState !== 'select') return
  const before = getStepAtPath(snap.rootSteps, snap.currentPath).players
  // `rootSteps` in this closure reflects the finished drag (React re-renders
  // between pointer events), matching how this function already trusts the
  // `undoStack` closure above.
  const [, count] = propagateFromPath(rootSteps, snap.currentPath, before)
  if (count === 0) return
  const edited = getStepAtPath(rootSteps, snap.currentPath)
  const movedPlayerLabels = Array.from(
    new Set(
      edited.players
        .filter((p) => {
          const b = before.find((bp) => bp.id === p.id && !!bp.isDefense === !!p.isDefense)
          return b && (b.x !== p.x || b.y !== p.y)
        })
        .map((p) => p.id),
    ),
  )
  setPendingPropagate({ path: snap.currentPath, before, affectedStepCount: count, movedPlayerLabels })
}
```

- [ ] **Step 4: Add the propagation actions**

```ts
function applyPropagate() {
  if (!pendingPropagate) return
  pushHistory() // also clears pendingPropagate via Step 2
  const [newRoot] = propagateFromPath(rootSteps, pendingPropagate.path, pendingPropagate.before)
  setRootSteps(newRoot)
}

function dismissPropagate() {
  setPendingPropagate(null)
}
```

- [ ] **Step 5: Add `insertStep` and `moveStep`**

```ts
function insertStep(path: StepPath, position: 'above' | 'below') {
  const step = getStepAtPath(rootSteps, path)
  if (position === 'below' && step.branches?.length) return // invariant: fork stays last
  pushHistory()
  const idx = path[path.length - 1]
  const insertAt = position === 'above' ? idx : idx + 1
  const newStep = freshStepFrom(step)
  setRootSteps((prev) => replaceSequenceAtPath(prev, path, (seq) => [
    ...seq.slice(0, insertAt), newStep, ...seq.slice(insertAt),
  ]))
  setCurrentPath([...path.slice(0, -1), insertAt])
  setSelectedIndex(null)
  setMultiSelected([])
}

function moveStep(path: StepPath, direction: 'up' | 'down') {
  const seq = getSequenceAtPath(rootSteps, path)
  const idx = path[path.length - 1]
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= seq.length) return
  if (seq[idx].branches?.length) return    // don't move a fork out of last position
  if (seq[target].branches?.length) return // don't displace a fork from last position
  pushHistory()
  setRootSteps((prev) => replaceSequenceAtPath(prev, path, (s) => {
    const copy = [...s]
    ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
    return copy
  }))
  setCurrentPath([...path.slice(0, -1), target])
  setSelectedIndex(null)
  setMultiSelected([])
}
```

- [ ] **Step 6: Export the new members**

Add to the returned object: `insertStep, moveStep, pendingPropagate, applyPropagate, dismissPropagate`.

- [ ] **Step 7: Typecheck** — `npx tsc --noEmit`. Errors, if any, should only be from Task 3/4/5 consumers not yet wired. Confirm none originate in `useDesignerState.ts` itself.

- [ ] **Step 8: Commit**
```bash
git add src/hooks/useDesignerState.ts
git commit -m "feat: designer insert/reorder step actions and downstream-propagation lifecycle"
```

---

### Task 3: Step tree — insert & reorder controls

**Files:**
- Modify: `src/components/designer/StepTree.tsx`

**Interfaces:**
- Consumes: new `onInsert(path, 'above'|'below')` and `onMove(path, 'up'|'down')` callbacks (wired from `designer.insertStep`/`designer.moveStep` in Task 4).

- [ ] **Step 1: Add props**

Read `StepTree.tsx`. Add to its props type:
```ts
onInsert: (path: StepPath, position: 'above' | 'below') => void
onMove: (path: StepPath, direction: 'up' | 'down') => void
```
Thread both through the recursive `<StepTree ... />` call (same as `onSelect`/`onDelete`/`onRemoveBranch` are already threaded).

- [ ] **Step 2: Render per-row controls**

In each step row (the `flex items-center` row that holds the "Step N" select button and the "Remove" button), add a small control cluster. Compute, for the row at index `i` in this `steps` sequence:
```ts
const isBranchPoint = !!step.branches?.length
const canMoveUp = i > 0 && !isBranchPoint && !steps[i - 1].branches?.length
const canMoveDown = i < steps.length - 1 && !isBranchPoint && !steps[i + 1].branches?.length
```
Add buttons (icon/text, `text-xs`, muted, `min-h-11` on the mobile twin — see note): `↑` (disabled unless `canMoveUp` → `onMove(path,'up')`), `↓` (disabled unless `canMoveDown` → `onMove(path,'down')`), `＋↑`/"insert above" (`onInsert(path,'above')`), and `＋↓`/"insert below" rendered only when `!isBranchPoint` (`onInsert(path,'below')`). Use `disabled:opacity-40 disabled:cursor-not-allowed`, matching the existing undo/redo button styling.

Keep the existing select + Remove behavior untouched.

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`. Expect errors only in the components that render `<StepTree>` without the new props (fixed in Task 4).

- [ ] **Step 4: Commit**
```bash
git add src/components/designer/StepTree.tsx
git commit -m "feat: insert-above/below and reorder controls in the designer step tree"
```

---

### Task 4: Branch discoverability + wire the new props through both panels

**Files:**
- Modify: `src/components/designer/BranchForms.tsx`
- Modify: `src/components/designer/DesignerSidePanel.tsx`
- Modify: `src/components/designer/MobileStepSheet.tsx`
- Modify: `src/app/designer/page.tsx` (branch status string)

**Interfaces:**
- Consumes: `countStepsAfter` (Task 1) via the panels; `insertStep`/`moveStep` (Task 2) passed into `StepTree` (Task 3).

- [ ] **Step 1: `AddBranchForm` explanatory line**

Read `BranchForms.tsx`. Add a `followingStepCount: number` prop to `AddBranchForm`. When the form is expanded, render above the inputs:
```tsx
<p className="text-xs text-text-muted">
  {followingStepCount > 0
    ? `The ${followingStepCount} step${followingStepCount === 1 ? '' : 's'} after this one will move onto the first branch. The second branch starts fresh from here.`
    : 'Both branches start fresh from this step.'}
</p>
```
Update the first input's placeholder to hint the existing continuation (e.g. `"First branch label (your existing continuation)"`). Leave `AddAnotherBranchForm` unchanged.

- [ ] **Step 2: Wire `DesignerSidePanel.tsx`**

Read the file. It already destructures `designer` and renders `<StepTree ... />` and `<AddBranchForm onAdd={...} />`. Import `countStepsAfter` from `@/lib/designerSteps`. Pass:
- to `<StepTree>`: `onInsert={designer.insertStep}` and `onMove={designer.moveStep}`.
- to `<AddBranchForm>`: `followingStepCount={countStepsAfter(designer.steps, designer.currentPath)}`.

- [ ] **Step 3: Wire `MobileStepSheet.tsx`**

Same two wirings as Step 2 (this file already imports `getSequenceAtPath`; add `countStepsAfter` to that import).

- [ ] **Step 4: Branch status string in `page.tsx`**

Read `designer/page.tsx`. The `AddBranchForm`'s `onAdd` ultimately calls `designer.addBranch`. Where the page can observe a branch being created, set a status like:
```ts
`Branched — ${count} step${count === 1 ? '' : 's'} moved onto "${label1}".`
```
Simplest: wrap the `addBranch` call the panels use with a small page-level handler that computes `countStepsAfter(designer.steps, designer.currentPath)` **before** calling `designer.addBranch(label1, label2)`, then `setStatus(...)`. If the panels call `designer.addBranch` directly today, add an `onBranchCreated?` callback or a thin `handleAddBranch` passed down in place of `designer.addBranch`. Pick the least-invasive option after reading the current wiring; keep it to the status message only (no behavior change to `addBranch`).

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit`. Expect zero errors project-wide now except anything Task 5 adds.

- [ ] **Step 6: Commit**
```bash
git add src/components/designer/BranchForms.tsx src/components/designer/DesignerSidePanel.tsx src/components/designer/MobileStepSheet.tsx src/app/designer/page.tsx
git commit -m "feat: surface branch downstream-preservation and wire insert/reorder into both panels"
```

---

### Task 5: Propagation banner + full manual verification

**Files:**
- Modify: `src/app/designer/page.tsx`

**Interfaces:**
- Consumes: `designer.pendingPropagate`, `designer.applyPropagate`, `designer.dismissPropagate` (Task 2).

- [ ] **Step 1: Render the banner (desktop + mobile)**

Read `page.tsx`. It already renders a `status` banner in both the mobile canvas area and the desktop `.relative flex-1` area. Alongside those, when `designer.pendingPropagate` is set, render a non-blocking banner (absolutely positioned over the canvas, `z-10`, `bg-surface-raised/95 border border-accent`):

```tsx
{designer.pendingPropagate && (
  <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-raised/95 border border-accent text-sm text-text shadow-lg">
    <span>
      Moved {designer.pendingPropagate.movedPlayerLabels.join(', ')}. Apply to{' '}
      {designer.pendingPropagate.affectedStepCount} later step
      {designer.pendingPropagate.affectedStepCount === 1 ? '' : 's'} where they haven’t moved yet?
    </span>
    <button
      onClick={designer.applyPropagate}
      className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground font-medium"
    >
      Apply
    </button>
    <button
      onClick={designer.dismissPropagate}
      className="px-2.5 py-1 rounded-md border border-border text-text-muted"
    >
      Dismiss
    </button>
  </div>
)}
```

Place one instance in the mobile canvas container and one in the desktop canvas container (mirroring how `status` is already rendered in both). Ensure it renders above the field but does not block canvas interaction elsewhere (it's a small top-centered bar).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, expect zero errors.

- [ ] **Step 3: Full manual verification** (dev server running, `http://localhost:3000/designer`; use Playwright if available, else drive a real browser). Report exactly what you observed at each point — not "works as expected."

  1. **Insert:** Add steps until you have 4 in a row. On step 2, click **＋ below** → confirm a new step 3 appears, steps renumber to 5 total, the new step duplicates step 2's token positions with no paths, and the view is on the new step. Use **＋ above** on a step and confirm placement + renumbering. Create a branch somewhere, navigate to the branch-point step, and confirm **＋ below is absent** there.
  2. **Reorder:** On a middle step click **↓**, confirm it swaps with the next and stays current; click **↑** to move it back. Confirm **↑** is disabled on the first step and **↓** is disabled on the last step and when the next step is a branch point.
  3. **Branch discoverability:** Build a 7-step linear play. Navigate to step 3, open **Add Branch** → confirm the line reads "The 4 steps after this one will move onto the first branch." Label them (e.g. "Original play" / "Team riff") and create → confirm steps 4–7 are nested under the first branch, the second branch is a single fresh step, and the page status reads "Branched — 4 steps moved onto 'Original play'."
  4. **Propagation (linear):** New play, 16 steps (append is fine). On step 9, in Position mode drag two players that are parked (no paths through the play) to clearly new spots. Confirm the banner appears naming those two players and the correct later-step count. Click **Apply** → step through 10–16 and confirm both players now sit at the new spot in each. Then give one of those players a path on, say, step 12 before re-testing: re-edit step 9, Apply, and confirm that player updates through step 11 but **not** from step 12 onward (the path step stops them), while the other player continues to the end.
  5. **Propagation (branches):** Build a play that forks after step 9. Edit a parked player on step 9, Apply → confirm both branches update independently; make the player diverge (add a path) partway down one branch and confirm only that branch stops at the divergence while the other keeps propagating.
  6. **Undo:** After an Apply, press Ctrl/Cmd+Z once → confirm the entire cascade reverts in a single undo. Confirm the banner does not reappear on unrelated edits, and does **not** appear when editing the last step or when a drag moves nobody.
  7. **Regression:** Confirm existing behaviors are intact — position drag still single-undo, Draw Path / Mark Throw unaffected, Preview walks the tree, Save/Publish unaffected.

- [ ] **Step 4: Commit**
```bash
git add src/app/designer/page.tsx
git commit -m "feat: downstream-propagation prompt banner in the designer"
```

---

## Self-Review Notes

- Every design-doc capability maps to a task: propagation math + branch count (Task 1), hook lifecycle + insert/reorder (Task 2), tree controls (Task 3), discoverability + wiring (Task 4), the prompt UI + end-to-end verification (Task 5).
- The branch-point-is-last invariant is enforced in three places: `insertStep` (`below` guard), `moveStep` (both guards), and `StepTree`'s `canMoveUp/canMoveDown/＋below` rendering.
- Propagation exactness relies on `addStep`'s deep copy of coords — verified by reading `useDesignerState.addStep`/`freshStepFrom`. The parked test additionally excludes steps where the player has a path, which prevents both false propagation and orphaned path start points.
- Propagation and the prompt are transient (not in `HistorySnapshot`), and `applyPropagate` goes through `pushHistory`, so undo/redo semantics are unchanged and the cascade is atomic.
- No file outside the listed set changes; the Viewer, field renderer, persisted types, and API routes are untouched.
