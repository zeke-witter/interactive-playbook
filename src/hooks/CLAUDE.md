# src/hooks/ — React hooks

Four client hooks. `useDesignerState` is the big one; the other three serve the Viewer.

## `useDesignerState.ts` — the Designer's entire state engine
The single source of truth for the editor. `app/designer/page.tsx` calls it once and threads the returned object into `DesignerCanvas`, `DesignerSidePanel`/`MobileStepSheet`, etc.

Owns: `rootSteps` (the nested `DesignerStep[]` tree), `currentPath` (`StepPath`), `mode`, `selectedIndex`/`multiSelected`, `pathType`, `inProgressPath`, `category`/`set`/`description`, `publishedPlayId`, and the `undoStack`/`redoStack`.

Key behaviors:
- **Immutable tree edits** go through `src/lib/designerSteps.ts` helpers. `updateCurrentStep` / mutations rebuild the tree, never mutate in place.
- **Undo/redo** is one linear stack of full `HistorySnapshot`s (`{rootSteps, currentPath, category, set, description}`). Discrete actions call `pushHistory()` first. Continuous drags are bracketed by `beginDrag` (snapshot on pointerdown) / `endDrag` (commit one entry on pointerup) / `cancelDrag` — so a whole drag is a single undo entry. Exposes `canUndo`/`canRedo`.
- **`addStep`** duplicates the current step, advances each player to the end of their drawn path, and transfers `hasDisc` along any `throw`.
- **`addBranch(l1, l2)`** forks: steps after the current index become branch 1 (or a fresh step), a fresh copy becomes branch 2; the current sequence is truncated at the fork and navigation jumps into branch 2. **`addAnotherBranch`** appends a branch at an existing fork. **`removeBranch`** drops a branch (nulls `branches` when empty).
- **Paths** matched on both `playerId` AND `isDefense` (shared Position ids). **Throw/disc**: `setDiscHolder`, `setThrow`, `clearDiscHolder` (also clears the throw), `clearThrow`.
- **Persistence**: autosaves to `localStorage["mousetrap-designer-autosave"]` (guarded by `hasHydrated` so the first render doesn't clobber a restored draft). `loadDraft`, `loadExistingPlay` (rebuilds the tree via `playToDesignerSteps`, sets `publishedPlayId` so a later Publish overwrites), `newPlay`, `markPublished`.

When adding a Designer capability, add an action here and go through the tree helpers + `pushHistory`; don't mutate `rootSteps` from components.

## Viewer hooks
- **`usePlayStep.ts`** — step navigation over the **flat** `Play`. Keeps a `history` stack of visited step ids (so Prev works across branch choices). `next()` is disabled at a branch point (you advance by choosing a branch → `goToStep(nextStepId)`). Computes `isLast` (via `isEnding` or end-of-array), and stepper progress (`stepperIndex`/`stepperTotal`/`showMoreIndicator`) by scanning forward to the next fork — relies on the branch-contiguity convention.
- **`useRoster.ts`** — generates a **random** roster (`Record<Position, string>`) from `src/data/names.ts` on each load, mixing gender ratios. Display names are intentionally not stable between sessions.
