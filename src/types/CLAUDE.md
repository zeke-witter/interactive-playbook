# src/types/ — Domain types

Two files, and the distinction between them is the single most important concept in the codebase.

## `play.ts` — the PUBLISHED, FLAT model

What a finished play looks like on disk (`src/data/plays/*.ts`) and what the Viewer reads.

- `Position` — `'H1'|'H2'|'H3'|'C1'|'C2'|'C3'|'C4'`. **Offense and defense reuse the same seven ids** — always disambiguate a player by `id` **and** `isDefense`.
- `PlayerState` — `{ id, x, y, isDefense?, hasDisc? }`. `x`/`y` are normalized 0–1 (see coordinate system in root `CLAUDE.md`).
- `PlayerPath` — `{ playerId, points[], type, isDefense? }`. `type: PathType` (`primary|secondary|clear|reset`) drives color. Defensive paths are authoring-only and never rendered in the Viewer.
- `ThrowArc` — `{ from, to }` (Positions).
- `PlayStep` — one step: `players`, `pathPreviews`, optional `throw`, `narrative` (`Partial<Record<Position,string>>`), optional `quiz`, optional `branches: PlayBranch[]`, optional `isEnding`.
- `PlayBranch` — `{ id, label, nextStepId }`. Branching is by **reference**: a step lists branches that each name the id of the step to jump to.
- `Play` — `{ id, name, category, set, description, steps: PlayStep[] }`. **One flat `steps` array**, even for branching plays.

### Critical layout convention (flat model)
Each branch's own steps are stored **contiguously right after the fork step**, and each branch's last step is `isEnding: true` (except whichever leaf is the literal last array element). `usePlayStep` and `playToDesignerSteps` both recover branch segments by scanning forward and stopping at the next branch point or `isEnding`. Don't emit flat steps any other way.

## `designer.ts` — the AUTHORING, NESTED model

What the Designer edits in memory. Never written to disk directly (it's converted to the flat model on publish, and drafts store this shape as JSON).

- `DesignerStep` — like `PlayStep` but branches are **embedded by value**: `branches?: DesignerBranch[]`. Also carries `quiz` opaquely so loading a published play with quizzes and republishing doesn't drop them (the UI can't author quizzes). No `id`/`force`/`isEnding` — those are derived at publish time.
- `DesignerBranch` — `{ label, steps: DesignerStep[] }`. A branch owns its sub-sequence directly (a real tree, not references).
- `DesignerMode` — `'position'|'path'|'throw'|'select'`.
- `StepPath` — `number[]`, the universal address into the nested tree. Alternating `[stepIndex, branchIndex, stepIndex, …]`, always odd length. `[0]` = first root step; `[2,1,0]` = root step 2 → branch 1 → step 0. Resolved by the helpers in `src/lib/designerSteps.ts`.

## Conversion
Flat ⇄ nested lives in `src/lib/playDesignerConvert.ts`. If you change either type, check that conversion and `designerSteps.ts` still hold.
