# Play Designer — Structural Editing (retroactive steps, branches, and downstream propagation) — Design

## Problem

The Designer is good at building a play *forward* from an empty first step, but poor at *revising* an existing multi-step play. Three concrete gaps, all reported from real use:

1. **Branching downstream-preservation is invisible.** Adding a branch at step 3 of a 7-step play *already* moves steps 4–7 onto the first branch (`addBranch` slices the remainder into branch 1) — but nothing in the UI tells the user that will happen, so they don't trust it and avoid the feature. This is purely a discoverability problem; the mechanic is correct.
2. **No mid-sequence insert or reorder.** `addStep` only ever *appends to the end* of the current sequence (`newIndex = sequence.length`). There is no way to insert a step between two existing steps, or to reorder steps. Fixing a play means deleting from the end and rebuilding.
3. **No way to propagate an earlier edit forward.** If a coach adjusts player positions in step 9 of a 16-step play, every later step where those players were simply *parked* (carried forward untouched) still shows the old positions. Today the only fix is to re-edit each downstream step by hand, or delete and rebuild steps 10–16.

## Goal & Non-Goals

Make the Designer a real *editor* of existing plays: insert and reorder steps anywhere, understand what branching does to downstream steps, and push an upstream position change forward through the steps that were just carrying it.

Specifically:
- **Insert** a step immediately above or below any step (not just append at the end).
- **Reorder** a step up or down within its own sequence.
- **Branch discoverability**: the Add Branch form states, before you confirm, exactly how many following steps will move onto the first branch, and a status message confirms it afterward.
- **Downstream propagation**: after editing player positions in a step that has later steps, offer a one-click "apply to later steps where these players haven't moved yet." Per-player, it walks forward and updates each player until that player diverges (gets their own movement) on each path.

**Non-goals** (keep scope tight; revisit later if wanted):
- **No moving the fork point** (e.g. "branch at step 4 instead of step 3") and **no moving steps between branches** — these are the next tier of restructuring and are deliberately out of this round.
- **No merging/flattening a branch back into the mainline.** (Consistent with the existing branching non-goal: branches are a strict tree.)
- **Propagation covers player positions only** — not `hasDisc`, `throw`, `pathPreviews`, or `narrative`. Those stay per-step.
- **No drag-to-reorder** in the step tree in this round — up/down controls only (a drag affordance can come later; up/down is enough to validate the need and is trivially touch-friendly).
- **No new automated tests** (project policy, unchanged).

## Invariant this feature must not break

**A branch-point step is always the last step in its sequence.** The whole app relies on the branch-contiguity convention (`usePlayStep`, `playToDesignerSteps`, `designerStepsToPlaySteps`): a fork ends the linear segment. If a plain step were ever placed *after* a branch-point step in the same sequence, `designerStepsToPlaySteps` would emit it into the flat array where `usePlayStep.next()` (which returns early at a branch point) could never reach it. Therefore:
- **Insert-below is disabled on a branch-point step.**
- **Reorder is disabled** for a branch-point step, and a step may not be moved into the position after a branch point.

Every other structural edit operates on the in-memory nested `DesignerStep` tree, where the contiguity convention does *not* apply — it is produced only at publish time — so inserts and reorders are plain immutable array splices via the existing `designerSteps.ts` helpers.

## Data Model

No changes to the persisted types (`play.ts`, `designer.ts`). `DesignerStep` already has everything needed; structural edits are array operations on `DesignerStep[]` sequences.

One new piece of **transient hook state** (not persisted, not in the undo snapshot) drives the propagation prompt:

```ts
type PendingPropagate = {
  path: StepPath           // the step that was just edited
  before: PlayerState[]    // that step's players BEFORE the edit (the baseline)
  affectedStepCount: number
  movedPlayerKeys: string[] // for the prompt summary, e.g. ["C3", "H1"]
} | null
```

A player is identified throughout by the composite key **`id` + `isDefense`** (offense and defense share Position ids — the same rule the path/throw code already follows).

## Why exact-equality propagation is correct here

`addStep` and `freshStepFrom` **deep-copy** player coordinates when creating the next step. So a player who has not moved since step 9 has *byte-identical* `x/y` downstream — exact float equality reliably detects "parked, untouched since step 9." A player who has a drawn path is advanced to their path end by `addStep`, so their downstream coords differ from step 9 and they are correctly excluded. The copy-forward model hands us the diff for free; no tolerance/epsilon needed.

**Parked test** for propagation eligibility at a downstream step, per player `p` (baseline position `O`):
`p` is parked at that step iff its position `=== O` **and** the step has no `pathPreview` for `p`. A player with a path at that step is cutting from there — treat that as divergence and stop (this also avoids leaving a path whose start no longer matches the token).

## Interaction Model

### Insert & reorder (step tree)

Each step row in `StepTree` (and its mobile twin in `MobileStepSheet`) gains a small control cluster:
- **↑ / ↓** — move this step up/down within its sequence. Disabled at the ends, and per the invariant above.
- **＋ above / ＋ below** — insert a fresh step (duplicating this step's positions, no paths — the `freshStepFrom` convention) immediately before/after. **＋ below is hidden on a branch-point step.**

Inserted step becomes the current step. All are single undo entries.

### Add Branch discoverability

`AddBranchForm` receives the count of steps that follow the current step in its sequence. When expanded it shows a line such as:

> The **4** steps after this one will move onto the first branch. The second branch starts fresh from here.

The first label input is pre-hinted as the *existing continuation* ("e.g. Original play"). After creation, the page status reads: *"Branched — 4 steps moved onto 'Original play'."* No behavior change to `addBranch` itself; this is UI + a status string.

### Downstream propagation

1. Trigger: the user finishes a **position-mode or select-mode drag** (`endDrag`) on a step that has at least one reachable later step, and at least one player actually moved.
2. The hook computes a **dry run** of the propagation (how many downstream steps would change, for which players) and sets `pendingPropagate`.
3. The page shows a **non-blocking banner** over the canvas:

   > Moved **C3, H1**. Apply to **4** later steps where they haven't moved yet? **[Apply]** **[Dismiss]**

4. **Apply** → `applyPropagate()` runs the real update (one `pushHistory()` entry, fully undoable) and clears the banner. **Dismiss** (or any further edit) clears it with no change.

Propagation walks the tree **forward from the edited step**: the rest of the edited step's own sequence, and recursively every branch reachable from it. It carries a per-player "still eligible" set that **forks at each branch** (a player may diverge in one branch but keep being parked in another) and **stops per-player at the first divergence** on each path.

Pseudocode (mutating via the immutable `replaceSequenceAtPath` rebuild):

```
moved = players whose (x,y) changed between `before` and the edited step's current players
eligible = { key -> {O: beforePos, N: afterPos} } for each moved player

walk(sequence, startIndex, eligible):
  elig = copy(eligible)
  for i in startIndex .. end:
    step = sequence[i]
    for [key,{O,N}] in elig:
      player = step.players.find(key)
      parked = player && player.pos == O && !step.hasPathFor(key)
      if parked: player.pos = N
      else:      elig.delete(key)        // diverged/absent → stop this player on this path
    for branch in step.branches ?? []:
      walk(branch.steps, 0, elig)        // each branch gets its own copy of elig
    if step.branches: break              // branch point is terminal for the linear scan

// entry: if edited step has branches, walk each branch from 0; else walk its sequence from editedIndex+1
```

## UI / Files touched

- `src/lib/designerSteps.ts` — add pure helpers: `countStepsAfter(root, path)` (for the branch form) and a forward step-walk used by propagation (or keep the walk inside the hook — see plan).
- `src/hooks/useDesignerState.ts` — new actions `insertStep(path, 'above'|'below')`, `moveStep(path, 'up'|'down')`; extend `endDrag` to set `pendingPropagate`; add `applyPropagate()` / `dismissPropagate()`; expose `pendingPropagate`. All content mutations `pushHistory()` first.
- `src/components/designer/StepTree.tsx` — per-row ↑/↓ and ＋above/＋below controls with the invariant-based disabling.
- `src/components/designer/BranchForms.tsx` — `AddBranchForm` gains a `followingStepCount` prop and the explanatory line.
- `src/components/designer/DesignerSidePanel.tsx` & `MobileStepSheet.tsx` — pass the new props/callbacks through to `StepTree` and `AddBranchForm`.
- `src/app/designer/page.tsx` — render the propagation banner (desktop + mobile), wired to `designer.pendingPropagate` / `applyPropagate` / `dismissPropagate`; set the "N steps moved onto '…'" status after a branch.

Nothing in `components/field/`, the Viewer, the data types, or the API routes changes — this is entirely Designer authoring UX over the existing tree model.

## Verification

No automated tests (policy). `npx tsc --noEmit` clean, then manual browser verification:

1. **Insert:** build a 4-step play; on step 2 use ＋below → confirm a new step 3 appears (old 3/4 become 4/5), positions duplicated from step 2, no paths; use ＋above on a step → confirm placement and renumbering; confirm ＋below is absent on a branch-point step.
2. **Reorder:** ↑/↓ a middle step, confirm it swaps and stays current; confirm ↑ disabled on the first step, ↓ disabled on the last / when the next step is a branch point.
3. **Branch discoverability:** on step 3 of a 7-step play, open Add Branch → confirm it reads "4 steps after this one will move onto the first branch"; create it → confirm steps 4–7 are under branch 1 and the status says so.
4. **Propagation happy path:** 16-step linear play; on step 9 drag two parked players to new spots → confirm the banner offers the right count and player names; Apply → confirm steps 10–16 show the new positions for exactly those players, up until any step where one of them had already been given a path (that step and beyond unchanged for that player); Undo → confirm the whole cascade reverts in one step.
5. **Propagation with branches:** a play that forks after the edited step; edit a parked player upstream, Apply → confirm both branches update independently and a player that diverges in one branch still propagates in the other.
6. **No false prompt:** editing the *last* step (no descendants), or a drag that moves nobody, shows no banner.
