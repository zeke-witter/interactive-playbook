# Play Designer — Preview Mode — Design

> Built as part of an overnight autonomous batch. Per standing instruction, this spec is not gated on a synchronous approval round-trip — clarifying questions on the two genuinely ambiguous points (branch handling, playback controls) were asked and answered before starting; everything else below follows from those answers plus ordinary judgment calls, noted inline.

## Problem

The designer lets you build a play step-by-step, but switching between steps (via the step tree) just snaps positions instantly — there's no way to see the play "in motion" (players sliding along their drawn paths, the disc animating on a throw) without saving it and viewing it through the real, separate play-viewer page. The user wants to walk through the whole play, animated, before saving.

## Decisions (confirmed with the user)

- **Branch handling:** Preview pauses at every branch point and shows the branch's labeled choices as buttons — the user picks live which branch to continue into, matching how a real viewer of the finished play will eventually work.
- **Controls:** No autoplay/timer. Just Prev / Next buttons and a step-position indicator; clicking Next animates the transition to the next step (or, at a branch point, is replaced by the branch-choice buttons).

## Design

**Entry point:** A new "Preview" button in the toolbar (top, near the Position/Draw Path/Mark Throw mode buttons) toggles the designer page into preview mode, replacing the editable canvas + toolbar with a read-only, animated preview view. An "Exit Preview" button returns to the editor exactly where it was left (preview keeps its own local navigation state, entirely separate from the editor's `currentPath`/`selectedIndex`/`mode` — entering or exiting preview never disturbs in-progress editing).

**Navigation state:** Preview owns a local `previewPath: StepPath`, initialized to `[0]` each time preview is entered.
- **Next** (only shown when the current preview step has no `branches`): advances to the next step in the same sequence if one exists (`[...path.slice(0,-1), idx+1]`); if there is no next step and no branches, the play has ended — Next is replaced by an "End of play" message.
- **Branch choice** (shown instead of Next when the current preview step has `branches`): one button per branch, labeled with that branch's label; clicking sets `previewPath` to `[...path, branchIndex, 0]`.
- **Prev**: steps back one hop — decrements the last index if it's not already 0 (`[...path.slice(0,-1), idx-1]`), or, if the current step is the first step of a branch (last index is 0 and path length > 1), backs out to the branch-point step (`path.slice(0,-2)`). Disabled at the very first step (`path` is `[0]`).
- **Step indicator:** "Step {n}" where `n = (previewPath.length + 1) / 2` (the count of step-hops taken), plus, when inside a branch, the chain of branch labels taken to get there (e.g. "via Break side deep").

**Rendering — reused, not rebuilt:** The shipped play-viewer's animated field components already do exactly what's needed (position tweening via Framer Motion driven purely by prop changes, no remount required, since token identity keys stay stable across steps of the same play): `FieldBackground`, `PathPreviews`, and per-player `PlayerToken` (with `isYou`/`dimmed` both `false` — those concepts are single-perspective-viewer-specific and don't apply to the designer's always-both-sides view). `Disc` is reused too, but its prop type is narrowed from the full `PlayStep` to a small structural shape (`{ id: string; players: PlayerState[]; throw?: ThrowArc }`) so a `DesignerStep` (which has no `id`, `narrative`, `quiz`, etc.) can be adapted into it without forcing a fake `PlayStep`; the real viewer's `FieldCanvas` keeps working unchanged since a full `PlayStep` still structurally satisfies the narrower type. Preview supplies `previewPath.join('-')` as the synthetic `id` Disc needs to key its throw-animation remount.

`StallCounter` is skipped in preview (drafts have no `stallCount` yet — that's added later when hand-integrating into a real play file, same as narrative/quiz today).

**Shared step-path helpers:** `getStepAtPath`/`getSequenceAtPath` (currently private, file-local functions inside `useDesignerState.ts`) move to a new small shared module, `src/lib/designerSteps.ts`, alongside `replaceStepAtPath`/`replaceSequenceAtPath` (kept together since they're mutually recursive with the read-only pair) — `useDesignerState.ts` imports all four from there, and the new preview component imports the two read-only ones it needs. This is a pure, risk-free extraction (no behavior change) justified by a second real consumer needing the same tree-walking logic.

## Non-Goals

- No editing while in preview (no drag, no path drawing, no throw marking) — it's read-only, matching "walk through it before saving."
- No narrative/quiz text in preview — the designer doesn't capture that data; it's added later.
- No autoplay/timer-driven advancement (confirmed with the user).
- No changes to the real shipped play-viewer's behavior — `Disc`'s prop-type narrowing is the only touch to viewer code, and it's a widening of what the type accepts, not a behavior change.

## Verification

No automated tests (project policy). Manual verification: build a short branching play (at least one fork with two branches), enter Preview, step through with Next, confirm players visibly animate along any drawn paths and the disc animates on a throw step; reach the branch point, confirm Next is replaced by labeled branch buttons, choose one, confirm it animates into that branch's first step; use Prev repeatedly to walk all the way back to step 1, confirmed Prev disables there; exit preview and confirm the editor is exactly as it was left.
