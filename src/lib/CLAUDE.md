# src/lib/ — Pure helpers

Framework-free utilities (no React). Two of them encode load-bearing invariants — treat those with care.

## Load-bearing

- **`designerSteps.ts`** — the four pure accessors for the nested `DesignerStep` tree, addressed by `StepPath` (`number[]`, alternating `[step, branch, step, …]`). Every Designer mutation goes through these; they never mutate in place.
  - `getStepAtPath(root, path)` → the target step.
  - `getSequenceAtPath(root, path)` → the `DesignerStep[]` array the target lives in (root array, or a branch's `steps`).
  - `replaceStepAtPath(root, path, updater)` → immutable single-step update.
  - `replaceSequenceAtPath(root, path, updater)` → immutable update of the containing sequence (recurses up to rebuild the branch chain).
- **`playDesignerConvert.ts`** — flat ⇄ nested conversion, and the place the branch-contiguity convention is produced/consumed.
  - `playToDesignerSteps(play)` — flat → nested. Walks forward from each branch's `nextStepId`, stopping at the next fork or `isEnding`, to rebuild each branch's sub-sequence.
  - `designerStepsToPlaySteps(steps, slug)` — nested → flat. Derives step ids (`slug-counter-label`), branch ids (from label), lays branch steps out contiguously, and sets `isEnding` on every branch leaf except the true last element.
  - `buildPlay({...})` — wraps the above into a full `Play`.
  - If you touch either function, keep the two in exact round-trip agreement — a published play must reload into the same tree.

## Field & rendering

- **`field.ts`** — `FIELD_WIDTH=100`, `FIELD_HEIGHT=120`, endzone depths, and `toPixel(x, y)` (normalized 0–1 → SVG units). Every SVG uses `viewBox="0 0 100 120"`; convert through `toPixel`, don't hardcode multipliers.
- **`pathColors.ts`** — `PATH_COLOR` map from `PathType` to hex (primary amber, secondary blue, clear grey, reset pink).

## Text & labels

- **`slug.ts`** — `sanitizeSlug` (name → kebab id, used for play ids, draft filenames, branch ids) and `toCamelCase` (id → the `export const` name used in `data/plays/*.ts`).
- **`names.ts`** — `GENERIC_DEFENDER_LABELS` (dimmed defenders render as D1–D7) and `substituteNames(text, roster)` which swaps position tokens (`C1`…`H3`) in prose for roster names via a `\b`-anchored regex. Store narrative with tokens; substitute at render.
- **`playLabels.ts`** — display strings + ordered lists for `category` and `set` (`CATEGORY_LABELS`, `SET_LABELS`, `ALL_CATEGORIES`, `ALL_SETS`).

## Misc

- **`sound.ts`** — `'use client'`; `playBubblePop()` synthesizes a short Web Audio "pop" (lazily creates/resumes a shared `AudioContext`). Played per entering token.
