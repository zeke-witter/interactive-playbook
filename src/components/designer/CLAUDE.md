# src/components/designer/ — Play Designer editor UI

The drag-and-drop authoring tool. All 13 components are orchestrated by the single `useDesignerState` hook (`src/hooks/`), which owns the nested `DesignerStep` tree and exposes the action API. Container components take the whole `designer` object; leaves take narrow props + callbacks.

**Read first:** `src/hooks/CLAUDE.md` (state engine), `src/lib/CLAUDE.md` (`designerSteps` tree ops), `src/types/CLAUDE.md` (`DesignerStep`, `StepPath`).

## The `StepPath` model (recurring everywhere)
Every step/branch operation is addressed by a `StepPath` — an alternating `[stepIndex, branchIndex, stepIndex, …]` array (odd length) resolved through the four helpers in `lib/designerSteps.ts`. `StepTree` and `DesignerPreview` both build and consume these; the hook mutates the tree immutably via `replaceStepAtPath`/`replaceSequenceAtPath`.

## Files
- **`DesignerCanvas.tsx`** — the interactive SVG field. Behavior is **mode-driven** (`position`/`path`/`throw`/`select`):
  - *position*: tokens draggable (`moveToken`, bracketed by `beginDrag`/`endDrag` for single-undo); fires `onPositionDragComplete` (dismisses the coach mark).
  - *throw*: only the disc holder drags; a floating disc follows the pointer (lifted above the fingertip on touch); `findHoverTarget` picks the nearest eligible receiver within a catch radius (wider for touch); release → `setThrow`. Ring colors mark holder/hover/receiver.
  - *path*: click a token to `startPath`, click background to `addWaypoint`; finished paths render as dashed polylines.
  - *select*: marquee box → `setMultiSelected`; group drag uses an origin snapshot so deltas don't compound.
  - Maps client → normalized coords via the SVG CTM inverse (`toSvgPoint`).
- **`DraggableToken.tsx`** — one draggable SVG token using **pointer capture** + a `movedRef` to disambiguate click from drag; emits `pointerType` (so the canvas widens touch radii); handles `pointercancel` (commits nothing). `touchAction:'none'`.
- **`DesignerSidePanel.tsx`** (desktop) / **`MobileStepSheet.tsx`** (mobile) — near-identical bodies: mode-contextual controls (path-type swatches, disc-holder toggle, throw chips, selection count), the category/set/description/step-label/narrative editors, and the step-tree + add-step/add-branch section. Mobile adds a `getSequenceAtPath`-based summary and `min-h-11` touch targets.
- **`StepTree.tsx`** — recursive visual tree of steps and nested branches. Builds each child's `StepPath`, highlights `currentPath` by array equality, and offers select / **Remove** step (guarded, `window.confirm`, branch-aware message) / **Remove Branch**. Recurses per branch with `depth+1`.
- **`BranchForms.tsx`** — `AddBranchForm` (two labels → `designer.addBranch`, forking the remaining steps onto branch 1) and `AddAnotherBranchForm` (one label → `addAnotherBranch` at an existing fork).
- **`DesignerPreview.tsx`** — read-only playback that walks the tree (`previewPath`) with Prev/Next/branch-choice; `goPrev` pops two path entries to exit a branch. Reuses the shared `components/field/` renderers with viewer-matching keys so tokens tween. Shows a "via A → B" branch trail and cumulative step number.
- **`DesignerTopBar.tsx`** (desktop) — wraps `FileSwitcher` + undo/redo + Preview.
- **`FileSwitcher.tsx`** — name/save/export/publish/load-draft/load-existing/delete/new. Publish and "Load Existing Play" are **dev-gated** (`NODE_ENV === 'development'`). Renders as a desktop popover or a mobile drawer (same inner fields).
- **`ToolRail.tsx`** (desktop, left) / **`MobileToolTabBar.tsx`** (mobile, bottom) — the mode switcher; both use **`ModeIcon.tsx`** for the per-mode glyphs.
- **`CoachMark.tsx`** — first-run overlay (arrow + hint). Dismissal driven externally by the page after the first position drag.

## Patterns
- **Container/presentational split:** `DesignerCanvas`, `DesignerSidePanel`, `MobileStepSheet` get the whole `designer`; everything else gets explicit props.
- **Desktop/mobile mirroring:** `ToolRail`↔`MobileToolTabBar`, `DesignerSidePanel`↔`MobileStepSheet`, and `FileSwitcher`'s two internal layouts. Touch targets are `min-h-11` (44px).
- **Undo discipline:** discrete actions `pushHistory()` in the hook; continuous drags are one undo entry via `beginDrag`/`endDrag`. Add new mutations as hook actions, not in-component tree edits.
- **Confirm before destroy** on delete step/branch/draft, New Play, and load-over-work.
- **Steps carry forward:** `addStep` duplicates the current step, advancing players to their path ends and transferring the disc along a `throw`.
