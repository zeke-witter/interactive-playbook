# Play Designer — Draft Saving/Loading + Disc Auto-Transfer — Design

## Problem

Three related gaps in the play designer:
1. "Save" is one-directional — it writes a JSON file but there's no way to load one back in. Closing the tab loses all in-progress work with no recovery.
2. Marking a throw doesn't move the disc. The thrower keeps `hasDisc` for the rest of that step (correct — the disc is still in flight), but "+ Add Step" duplicates that same holder into the new step too, silently leaving the disc on the wrong player until the user notices and manually re-toggles it in Position mode.
3. Every save creates a new timestamped file rather than updating a named draft in place, which doesn't match an iterative "keep working on this same play" workflow.

## Goal & Non-Goals

Fix all three. Confirmed with the user:
- Saving the same name again **overwrites** the existing file (no more timestamp suffix).
- Add a **named draft list** (load + delete) backed by files in `designer-output/`, alongside **localStorage autosave** as a separate, silent safety net for the current in-progress session.
- Non-goal: no draft renaming, no folders/categories for organizing drafts, no versioning/undo beyond what git already provides for anything actually promoted into a real play file.

## 1. Disc Auto-Transfer on "+ Add Step"

In `useDesignerState.ts`'s `addStep()`, if the step being duplicated from has a `throw` set, the new step's players are built with the disc moved: the `throw.to` player (offense only) gets `hasDisc: true`, the `throw.from` player gets `hasDisc: false`, everyone else (including all defense tokens, which never hold the disc in this data model) is copied unchanged. If there's no `throw` on the current step, `addStep` behaves exactly as it does today (a plain copy).

## 2. LocalStorage Autosave

A fixed key (`mousetrap-designer-autosave`) stores `{ category, set, steps }` — the same shape already sent to the save API. Two effects in `useDesignerState`, following this codebase's established SSR-safe hydration pattern (already used in `useProgress.ts`/`useRoster.ts` — seed state with a static default, only apply anything derived from browser storage inside a `useEffect` after mount, never during the initial render):

- **Restore-on-mount** (`useEffect(..., [])`): reads the key once, and if valid data is found, applies it via `setRootSteps`/`setCategory`/`setSet`/`setCurrentPath([0])`. Always sets a `hasHydrated` flag to `true` when done (whether or not anything was restored), wrapped in try/catch so malformed or absent data is silently ignored.
- **Autosave-on-change** (`useEffect(..., [hasHydrated, rootSteps, category, set])`): writes the current state to the key, but only once `hasHydrated` is `true`. This ordering guard is the important part — without it, the autosave effect's first run (which fires on mount regardless of the restore effect having scheduled an update yet) would immediately overwrite a just-restored draft with the still-default empty state, since both effects close over the same pre-restore render's values on that first pass.

This is silent and automatic — no button, no confirmation, no indication in the UI beyond the fact that reopening `/designer` picks back up where you left off.

## 3. Named Drafts (Save/Load/Delete)

**Save** (`POST /api/designer/save`, existing route): filename changes from `${safeName}-${timestamp}.json` to just `${safeName}.json` — this alone achieves overwrite-by-name, no other logic changes.

**List** (new: `GET /api/designer/drafts`): reads `designer-output/`, returns `{ drafts: string[] }` — filenames with `.json` stripped, sorted. Returns an empty list (not an error) if the directory doesn't exist yet.

**Load / Delete one** (new: `GET` and `DELETE` on `/api/designer/drafts/[name]`): `GET` reads and returns that draft's raw JSON content (404 if missing). `DELETE` removes the file (404 if missing). Both sanitize `name` the same way the existing save route already sanitizes its filename (strip anything outside `a-z0-9-`), so there's no path-traversal surface.

**Hook**: `useDesignerState` gains `loadDraft(data: { category?, set?, steps })`, which replaces `rootSteps`/`category`/`set` wholesale and resets `currentPath` to `[0]`.

**Page** (`src/app/designer/page.tsx`) owns the draft list and its I/O, matching the existing pattern where the page (not the toolbar) owns `handleSave`'s fetch call:
- Fetches the draft list on mount and after every successful save/delete.
- `handleLoadDraft(name)`: confirms (since it discards current unsaved work — the autosave net makes this low-risk, but the confirm still applies, matching the confirm-before-destructive-action pattern already used for branch/step deletion), fetches the draft, calls `designer.loadDraft(...)`.
- `handleDeleteDraft(name)`: confirms, calls `DELETE`, refreshes the list.

**Toolbar**: gains a "Load Draft" section listing the fetched names, each with a Load button and a Delete button, passed down as props (`draftNames`, `onLoadDraft`, `onDeleteDraft`) alongside the existing `onSave`.

## Verification

No automated tests (project policy, unchanged). Manual verification: build a step with a throw, add a step, confirm the disc moved to the receiver automatically. Refresh `/designer` mid-edit and confirm the autosave restored the in-progress work. Save a draft, reload the page, confirm it appears in the Load list; load it and confirm it replaces the canvas correctly; save it again under the same name and confirm the file was overwritten in place (not duplicated); delete it and confirm it disappears from the list and from `designer-output/`.
