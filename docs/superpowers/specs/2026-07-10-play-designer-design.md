# Play Designer — Design

## Problem

Play data (player positions, cut/clear paths, throw arcs) has been built by reading hand-drawn diagrams and photos, converting distances to our normalized coordinate system by hand, and iterating through several rounds of screenshot-driven correction per play. This is slow and error-prone — several rounds this session were spent fixing positions that were themselves fixes for a previous misreading.

## Goal & Non-Goals

Build an in-app tool where the user places every token, draws every cut/clear path, and marks every throw directly — producing exact `{x, y}` data instead of an approximation of a photo. The output plugs directly into our existing `PlayStep`/`Play` types.

**Non-goals for this pass** (explicitly deferred, confirmed with the user):
- Yardage ruler/grid overlay or position snapping — freeform dragging only.
- Flexible/zone rosters — fixed 14 tokens (H1-H3, C1-C4, and their 7 defensive counterparts) covers every play built so far.
- Authoring narrative, quiz, stall count, or branch content — that stays in our existing conversational workflow. The designer only produces the geometric layer: positions, paths, disc holder, and throws.
- The "break-side denial zone" overlay and any other future analysis tools the user mentioned — noted for a later pass.
- Any changes to the shipped viewer app's behavior. The designer is an unlinked internal route; nothing about `/plays/[playId]` changes.

## Architecture

- **Route**: `src/app/designer/page.tsx`. Not linked from any nav or picker — reached by typing the URL directly. Client component (`'use client'`), like the existing play page.
- **Reused as-is**: `FieldBackground` (already supports `showEndzone`), `FIELD_WIDTH`/`FIELD_HEIGHT`/`toPixel` from `src/lib/field.ts`, and the same path-type color map currently inlined in `PathPreviews.tsx` (`primary`=yellow, `secondary`=light blue, `clear`=grey, `reset`=pink) — extracted to a shared export so both the viewer and the designer import the same source of truth instead of duplicating the map.
- **New components** (all under `src/components/designer/`):
  - `DesignerCanvas.tsx` — renders the field plus draggable tokens and in-progress path waypoints. Structurally like `FieldCanvas` but swaps the read-only `PlayerTokens` for a new `DraggableToken` per player, and adds a waypoint-collecting click layer when in Draw Path mode.
  - `DraggableToken.tsx` — a circle + label, positioned via the step's stored `{x, y}`, using pointer events (`onPointerDown`/`onPointerMove`/`onPointerUp`) to update position in state as the user drags. No Framer Motion needed here — this is direct manipulation, not a scripted animation.
  - `DesignerToolbar.tsx` — mode switch (Position / Draw Path / Mark Throw), path-type picker (four color swatches), step list with add/duplicate/delete/reorder, endzone toggle, Save button.
  - `useDesignerState.ts` — a hook holding `steps: DesignerStep[]` (see Data Model) plus the current step index, current mode, and in-progress path waypoints. All mutations (drag, add waypoint, set throw, add/duplicate/delete step) go through this hook.

## Data Model

A `DesignerStep` mirrors the geometric slice of `PlayStep`:

```ts
type DesignerStep = {
  players: PlayerState[]       // all 14 tokens, x/y/isDefense/hasDisc — same shape as today
  pathPreviews: PlayerPath[]   // same shape as today: {playerId, points, type}
  throw?: ThrowArc             // same shape as today: {from, to}
}
```

This is intentionally a strict subset of `PlayStep` — no `id`, `label`, `narrative`, `quiz`, `branches`, `stallCount`, `force`, `isEnding`. When the user hands me the exported file, I add those fields and the play-level metadata (`id`, `name`, `category`, `set`, `description`) to produce the final `Play` object, same as every play built by hand this session.

The 14 tokens always exist in every step (fixed roster, per the confirmed scope) — `players` is always length 14, matching the `H1/H2/H3/C1/C2/C3/C4` offense + their defensive mirrors pattern every existing play file already uses.

## Interaction Model

**Position mode (default on entry):** drag any token; pointer position converts back to normalized `{x, y}` via the inverse of `toPixel` and updates that token in the current step.

**Draw Path mode:** click a token to begin a path from its current position (recorded as the path's first point); each subsequent click adds a waypoint. Pressing Enter (or clicking a "Finish Path" button that appears in the toolbar once a path has at least one waypoint) ends the path and adds it to the step's `pathPreviews` with the currently-selected type/color. Escape cancels an in-progress path. A path can only belong to one player per step — starting a new one for the same player replaces the old one (matches how every existing multi-point cut in our data is just one path per player per step).

**Mark Throw mode:** click the current disc holder (must have `hasDisc: true`), then click the intended receiver — sets `throw: {from, to}` on the current step. Disc possession itself is set in Position mode: selecting a token shows a small "Has Disc" toggle button next to it in the toolbar; turning it on for one token turns it off for whichever token had it before (only one holder at a time, matching the data model).

**Steps:** "+ Add Step" duplicates every token's current `{x, y}` from the step you're on into a new step, with empty `pathPreviews` and no `throw` (paths and throws are step-specific and shouldn't carry over — only positions do, since a new step usually means "some of these have now moved"). A step list lets you click back to any earlier step to review or edit it; edits to an earlier step do not retroactively change later steps (each step's data is independent once created, same as our current model).

## Export

A "Save" button in the toolbar calls `POST /api/designer/save` with the full `steps: DesignerStep[]` array and a user-supplied short name (e.g. `zipper-v2`). The route handler (`src/app/api/designer/save/route.ts`) writes it to `designer-output/<name>-<timestamp>.json` in the repo root. This directory is gitignored (matching the existing `.superpowers/.gitignore` self-ignoring pattern already used in this repo) — it's scratch handoff space between the user and me, not committed content.

This only works when running the local dev server (the API route needs filesystem access) — consistent with the rest of this session's workflow, where verification has always happened against `npm run dev` locally before deploying.

## Verification

No automated tests (project-wide policy). Manual verification: load `/designer`, drag several tokens and confirm position updates live, draw a multi-point path and confirm it renders with the correct dashed color, mark a throw and confirm it's recorded, add a second step and confirm it starts as a copy of the first, hit Save and confirm the JSON file appears in `designer-output/` with the expected shape. Cross-check the exported JSON's coordinate values by spot-checking one or two tokens against where they were visually dragged.
