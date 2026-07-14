@AGENTS.md

# Mousetrap Interactive Playbook

An interactive playbook web app for the Mousetrap ultimate frisbee team. Two tools share one field-rendering engine:

- **Play Viewer** (`/`, `/plays/[playId]`) — the teaching tool players use. Pick a play, pick your position, step through it with per-position narrative and animated player/disc motion. Works on phone, tablet, and desktop.
- **Play Designer** (`/designer`) — a drag-and-drop field editor for authoring plays: place players, draw cutting paths, mark throws, add steps and branches, then preview and publish. Desktop-first (mobile shell exists), currently single-user.

For product/UX context, audience, and the design-token reference, see **`docs/design/design-standards.md`** — it is the most current prose description of what this app is and who it's for. `SPEC.md` is the original spec (some type/route details have since evolved; this file supersedes it where they disagree). The stock `README.md` is boilerplate — ignore it for anything but run instructions.

## Golden rules

1. **This is NOT stock Next.js.** Next.js 16 App Router with breaking changes vs. training data — read `node_modules/next/dist/docs/` before writing framework code (see `AGENTS.md`).
2. **No automated tests — by policy.** Verify changes by hand in a live browser (`npm run dev`). Do not add a test suite.
3. **No backend/database.** All content is files on disk. Writes (publish, save draft, edit narrative) go through dev-only API routes that mutate the local filesystem via `ts-morph`. Production (Vercel) is read-only.
4. **Preserve the branch layout convention** (see Data model below) — several readers depend on it. Breaking it silently corrupts branch navigation.
5. **Delegate to agents on Opus.** When spawning subagents on this project (the Agent tool), always pass `model: "opus"` — never Sonnet. The project also pins `model: opus` in `.claude/settings.local.json` so inherit-from-parent agents resolve to Opus, but set it explicitly on every Agent call regardless.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, `'use client'` for anything interactive |
| Language | TypeScript (strict), path alias `@/*` → `src/*` |
| Styling | Tailwind CSS v4 (tokens defined in `src/app/globals.css` `@theme`) |
| Field rendering | Inline React SVG, single `viewBox="0 0 100 120"` |
| Animation | Framer Motion (`motion.g` / `motion.circle`) |
| Codegen | `ts-morph` (publish route writes/edits play `.ts` files) |
| Fonts | Oswald (`--font-display`, headers/labels), Geist Sans (body) |
| Persistence | Files on disk + `localStorage` (autosave, progress, coach-mark) |

## Architecture

```
                       ┌──────────────────────────────────────────┐
                       │              src/types/                    │
                       │  play.ts  — Play, PlayStep (FLAT model)    │
                       │  designer.ts — DesignerStep (NESTED tree)  │
                       └──────────────────────────────────────────┘
                              ▲                         ▲
      ┌───────────────────────┘                         └────────────────────────┐
      │  PLAY VIEWER                                        PLAY DESIGNER           │
      │  app/page.tsx (browse)                              app/designer/page.tsx   │
      │  app/plays/[playId]/page.tsx                        │                       │
      │     │                                               │ useDesignerState()    │
      │     │ usePlayStep()  ← history stack                │  (rootSteps tree,     │
      │     │ useRoster()    ← random names                 │   currentPath,        │
      │     │ useProgress()  ← localStorage                 │   undo/redo, mode)    │
      │     ▼                                               ▼                       │
      │  components/field/   ◄───── SHARED SVG ENGINE ─────►  components/designer/  │
      │  (FieldCanvas, PlayerTokens,                        (DesignerCanvas,        │
      │   PathPreviews, Disc, ...)                           ToolRail, StepTree,    │
      │  components/sidebar/                                 BranchForms, Preview)  │
      │  (Sidebar, NarrativePanel, PlayControls,             │                      │
      │   BranchChoice, PlayPicker, ...)                     │                      │
      └───────────────────────────────────────────────────────────────────────────┘
                                          │
                    lib/playDesignerConvert.ts (tree ⇄ flat)
                                          │
                                          ▼
              API routes (dev-only, ts-morph) ──► src/data/plays/*.ts + index.ts
              /api/designer/publish            designer-output/*.json (drafts)
              /api/designer/save|drafts
              /api/plays/[playId]/narrative
```

### The two step models (most important thing to understand)

There are **two representations of a play**, and converting between them is central:

- **`Play` / `PlayStep`** (`src/types/play.ts`) — the **published, FLAT** model. A play is one `steps: PlayStep[]` array. Branching is expressed by a step carrying `branches: PlayBranch[]`, where each branch points to another step by `nextStepId`.
- **`DesignerStep` / `DesignerBranch`** (`src/types/designer.ts`) — the **authoring, NESTED tree** model used inside the Designer. A step directly contains `branches?: DesignerBranch[]`, and each branch contains its own `steps: DesignerStep[]`.

**Conversion** lives in `src/lib/playDesignerConvert.ts`:
- `playToDesignerSteps(play)` — flat → nested (used by "Load existing play" into the Designer).
- `designerStepsToPlaySteps(steps, slug)` / `buildPlay(...)` — nested → flat (used by publish). Derives step ids from `slug + counter + label`, branch ids from labels.

### The branch-contiguity convention (do not break)

In the **flat** model, each branch's own steps are stored **contiguously right after the fork step**, and the last step of a branch is marked `isEnding: true` (except whichever leaf happens to be the very last element of the array). This lets a *forward linear scan* — stopping at the next branching step or `isEnding` — recover exactly one branch segment without wandering into a sibling branch. Both `usePlayStep` (viewer nav) and `playToDesignerSteps` (round-trip load) rely on it. `designerStepsToPlaySteps` produces it. If you emit flat steps any other way, both readers break.

### StepPath addressing (Designer)

The Designer addresses any node in the nested tree with `StepPath = number[]`:
- `[i]` → root-level step `i`.
- `[i, b, j]` → step `i` → its branch `b` → step `j` in that branch.
- …alternating `branchIndex, stepIndex` pairs for deeper nesting.

`src/lib/designerSteps.ts` provides the pure tree accessors every mutation goes through: `getStepAtPath`, `getSequenceAtPath` (the array a step lives in), `replaceStepAtPath`, `replaceSequenceAtPath`. All Designer edits are immutable updates via these helpers.

### Coordinate system

Positions are stored **normalized 0–1**: `x` 0 = left sideline → 1 = right sideline; `y` 0 = attacking endzone (top) → 1 = own endzone (bottom). The field always defends **upward**. `src/lib/field.ts` `toPixel(x, y)` scales to the `100 × 120` SVG viewBox. Convert through `toPixel` — don't hardcode multipliers.

### Persistence & the dev-only write model

| What | Where | How |
|---|---|---|
| Designer autosave | `localStorage["mousetrap-designer-autosave"]` | on every edit; restored on mount |
| Viewer progress | `localStorage["mousetrap-progress"]` | positions completed per play |
| Coach-mark dismissal | `localStorage["mousetrap-designer-coachmark-dismissed"]` | |
| Named drafts | `designer-output/*.json` | `POST /api/designer/save`, `GET/DELETE /api/designer/drafts` |
| Published plays | `src/data/plays/<id>.ts` + `index.ts` | `POST /api/designer/publish` — **dev only**, `ts-morph` |
| Narrative edits | the play's `.ts` file | `PATCH /api/plays/[playId]/narrative` — **dev only**, `ts-morph` |

The publish/save/narrative flows are gated on `NODE_ENV === 'development'` and mutate real source files. To change published content you run locally, publish/edit, then commit the generated `.ts`. Rosters are **randomized on every viewer load** (`useRoster` + `src/data/names.ts`) — display names are not stable.

## Directory map

| Path | Purpose | Has own CLAUDE.md |
|---|---|---|
| `src/app/` | Routes (viewer, designer) + API routes | ✅ |
| `src/app/api/` | Dev-only filesystem-mutating endpoints | ✅ |
| `src/components/field/` | Shared SVG field-rendering engine | ✅ |
| `src/components/sidebar/` | Play Viewer UI (narrative, controls, picker) | ✅ |
| `src/components/designer/` | Play Designer editor UI | ✅ |
| `src/hooks/` | `useDesignerState`, `usePlayStep`, `useProgress`, `useRoster` | ✅ |
| `src/lib/` | Pure helpers (tree ops, conversion, field math, slugs, sound) | ✅ |
| `src/data/` | Play content (`plays/*.ts`), glossary, roster names | ✅ |
| `src/types/` | The two step models | ✅ |
| `docs/design/` | Product/UX briefing + screenshots |  |
| `docs/superpowers/` | Dated spec→plan trail for every shipped feature |  |

## Conventions

- **Immutable tree edits** in the Designer go through `designerSteps.ts` helpers, never in-place mutation.
- **Undo/redo** is one linear stack of full state snapshots in `useDesignerState`. Any content-mutating action calls `pushHistory()` first. Position drags coalesce into one undo entry via `beginDrag`/`endDrag` (snapshot captured on pointerdown, pushed on pointerup) — don't push per-pointermove.
- **Confirm before destroy.** Every irreversible action (`confirm()`) — delete step/branch/draft, New Play, load-over-current-work — even where also undoable.
- **Drag-to-act over click-then-click.** The path-drawing and mark-throw gestures are single drags; prefer "point at what you mean" for new interactions.
- **Selection rings, not repainted tokens.** Active token = colored ring (accent = holder, white = live drag-hover, green = confirmed receiver); the token's own fill never changes to signal selection.
- **Position tokens in prose** (`C1`…`C4`, `H1`…`H3`) are substituted with roster names at render via `substituteNames` (`src/lib/names.ts`). Store narrative/labels with tokens, not names.
- **Offense/defense share the same seven Position ids** — always disambiguate a player by `id` **and** `isDefense` (a common bug source; see the path filters in `useDesignerState`).
- **Design tokens** live in `globals.css` `@theme` and are used as Tailwind classes (`bg-surface`, `text-text-muted`, `border-accent`, `text-accent`, `success-*`, `danger-*`). Dark theme, lime accent (`#a3e635`). Don't hardcode hex in components (SVG field colors are the deliberate exception).
- **Client vs server:** anything interactive/stateful/animated declares `'use client'`; pure presentational SVG (`FieldBackground`, `PathPreviews`) does not.

## Running

See `README.md`. In short: `npm install`, then `npm run dev` → http://localhost:3000. Publishing plays and editing narrative only work under `npm run dev` (dev-only API routes).
