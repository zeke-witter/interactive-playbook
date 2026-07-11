# Play Designer — Branching Support — Design

## Problem

The play designer models a play as a flat, linear array of steps (`DesignerStep[]`, navigated by index). The real `Play`/`PlayStep` type already supports branching (a step can have `branches: PlayBranch[]`, each pointing to a different `nextStepId`) — Reverse Flood used this before all hand-built plays were removed. The designer has no way to author that: there's no way to fork a sequence into two or more named alternatives, each continuing independently.

## Goal & Non-Goals

Let the user build a play's "happy path" as they do today, then insert a branch at any step along it — the existing continuation after that step becomes one branch automatically (nothing already built is lost), and the user adds one or more fresh alternate branches from the same point. Branches can themselves branch again (unlimited nesting), though the user expects to rarely need more than one level.

**Non-goals** (confirmed with the user):
- No merging/rejoining branches back into a shared later step — every branch always runs to its own independent ending. This is a strict tree, not a general graph.
- No auto-collapse behavior when a step is left with only one branch after a deletion — deleting down to one branch is allowed and just looks a little odd; the user can delete the remaining one too if they want to fully undo a fork.
- The designer does not generate step ids or flatten the tree into the real `PlayStep[]` + `nextStepId` array shape — that flattening happens when the exported JSON is integrated into a real play file (the same place narrative, quiz, labels, and stall counts already get added).

## Data Model

`DesignerStep` gains an optional `branches` field. A step either has a normal continuation (the next `DesignerStep` in whatever array it lives in) or it forks (`branches` present) — never both:

```ts
// src/types/designer.ts
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
```

The play's root sequence is just `DesignerStep[]` — the exact same shape as a branch's `steps`, recursively. No wrapper type needed at the root.

**Current position** changes from a single `currentStepIndex: number` to a **path**: `number[]`, alternating step-index and branch-index. `[2]` means "root sequence, step index 2." `[2, 1, 0]` means "root step 2 → its branch at index 1 → that branch's step index 0." A path's length is always odd (it always ends on a step index, never a branch index) — `[stepIdx]`, `[stepIdx, branchIdx, stepIdx]`, `[stepIdx, branchIdx, stepIdx, branchIdx, stepIdx]`, and so on.

Path-resolution helpers, colocated with the hook (not a separate module — they're small and only meaningful in the context of `useDesignerState`'s tree):
- `getStepAtPath(root: DesignerStep[], path: number[]): DesignerStep` — walks the path, returns the step at the end.
- `getSequenceAtPath(root: DesignerStep[], path: number[]): DesignerStep[]` — returns the array *containing* the last step in the path (i.e. the sequence you'd push/splice into to add a sibling step). For a path of length 1, this is `root` itself. For a longer path, it's `getStepAtPath(root, path.slice(0, -2)).branches[path[path.length - 2]].steps`.
- `replaceStepAtPath(root: DesignerStep[], path: number[], updater: (step: DesignerStep) => DesignerStep): DesignerStep[]` — returns a new root tree with the step at `path` replaced (immutable update, threading the copy through every ancestor array along the path — same idea as the existing flat-array `updateStep`, generalized to nested arrays).
- `replaceSequenceAtPath(root: DesignerStep[], path: number[], updater: (seq: DesignerStep[]) => DesignerStep[]): DesignerStep[]` — same, but replaces the whole sequence containing the path's last step (needed for add/delete/splice operations on a sequence, as opposed to editing one step's own fields).

All four are pure functions operating on plain data — no React involved — so they're straightforward to reason about and cheap to re-verify by inspection.

## Interaction Model

**Adding a branch** (button: "Add Branch", shown on the currently-viewed step only when it does *not* already have `branches`):
1. A small inline form asks for two labels (branch 1, branch 2) — matches the existing `SaveForm` pattern (plain inputs + a confirm button, no modal).
2. On submit: take everything currently *after* the current step in its own sequence (could be zero or more steps) and make it branch 1's `steps`. If there was nothing after it, branch 1 starts with one fresh step duplicating the current step's positions (same convention `addStep` already uses). Branch 2 always starts fresh with one duplicated step, regardless.
3. The current step's `branches` is set to `[branch1, branch2]`, and the removed continuation (if any) is spliced out of the parent sequence.
4. View switches to branch 2's first step (the newly-created alternate, since branch 1 is just the already-reviewed happy path).

**Adding another branch** (button: "+ Add Another Branch", shown only when the current step already has `branches`): appends one more branch, prompting for just its label, with one fresh step duplicating the branch-point's positions. No upper limit on count.

**Removing a branch** (small "Remove" action per branch in the tree view, with a confirm step since it deletes that branch's whole sub-tree): splices that branch out of the parent step's `branches` array. No special-casing when this leaves exactly one branch remaining (confirmed non-goal above).

**Navigating**: the toolbar's step list becomes a recursive indented tree. Each step is a clickable row (same as today); each branch renders as a small labeled sub-group, indented, containing its own recursive step list. Clicking any step row sets the current path to that step's path.

**Everything else is unchanged**: Position/Draw Path/Mark Throw modes, the canvas, `DraggableToken` — all operate on "the current step," however it's looked up, so none of them need to know paths exist. Only the hook's step-management functions and the toolbar's step-list rendering change.

## Export

Unchanged in spirit from the current designer: `POST /api/designer/save` still receives `{ name, category, set, steps }`, and `steps` is still written to the JSON file as-is — it's just that `steps` (and any step's `branches[].steps`) can now be a real tree instead of always being flat. No server-side changes needed at all; the API route already treats `steps` as opaque JSON.

## Verification

No automated tests (project policy, unchanged). Manual verification: build a 3-step linear sequence, add a branch at step 2 (confirm step 3 becomes branch 1 automatically, labeled), build out branch 2's own steps, add a third branch alongside, add a nested branch inside one of those branches, delete a branch and confirm its sub-tree is gone, and confirm the exported JSON has the expected nested shape matching what was built.
