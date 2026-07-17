# src/components/sidebar/ — Play Viewer UI

The Viewer's right-hand panel. `Sidebar.tsx` is the composition root; the other files are its children. These are largely **presentational** — play progression is owned by `plays/[playId]/page.tsx` + `usePlayStep`; components communicate upward via `on*` callbacks and keep only local UI state.

## Files
- **`Sidebar.tsx`** — layout root. Arranges `PositionSelector`, `PlayHeader`, the scrollable `NarrativePanel`/`QuizPanel` region, `PlayControls`, and the play picker (`PickerDrawer` on mobile, inline `PlayPicker` on desktop). Computes `nextDisabled = !!quiz && !quizPassed`. Stateless.
- **`PlayHeader.tsx`** — app title + play name + "Step X of N" line (label run through `substituteNames`).
- **`PositionSelector.tsx`** — the "You are:" dropdown that drives which position's narrative shows. Options labeled by roster name; value lifted to the page.
- **`NarrativePanel.tsx`** — shows the current step's narrative for the selected position (or a "you're off the disc" fallback). Delegates term/tooltip rendering to `NarrativeWithTooltips`. (Read-only; narrative is edited by re-publishing from the Designer — the old dev-only inline editor + its `/api/plays/[playId]/narrative` route were removed in the accounts/auth work.)
- **`NarrativeWithTooltips.tsx`** — the glossary engine. Substitutes names, then splits text on a longest-match-first regex built from `GLOSSARY` keys; matched terms get an underline + hover tooltip, and terms with a `zone` call `onHighlightZone` to light up the field.
- **`QuizPanel.tsx`** — a step's quiz (`quiz[selectedPosition]`): select an option → immediate correct/incorrect styling + explanation, and reports `onAnswered(correct)` which unblocks Next. (Quizzes are being de-emphasized product-wise — see `docs/design/design-standards.md` — but the mechanism is here.)
- **`PlayControls.tsx`** — switches between linear nav (`StepControls`) and branch nav (`BranchChoice`) based on `step.branches`.
- **`StepControls.tsx`** — Prev/Next + progress dots + a "more steps ahead" fork glyph (`showMoreIndicator`). Next disabled by `isLast` or quiz gating.
- **`BranchChoice.tsx`** — the "What happens next?" buttons at a branch point; clicking calls `onChoose(branch)` → the page does `goToStep(branch.nextStepId)`.
- **`PlayPicker.tsx`** — hierarchical browser (category → set → play) with breadcrumbs, data-driven from `data/plays` helpers; routes via `useRouter().push('/plays/<id>')`.
- **`PickerDrawer.tsx`** — mobile-only (`md:hidden`) slide-in wrapper around `PlayPicker` behind a ☰ button.

## Patterns
- **`roster` is threaded everywhere** and all user-facing prose (narrative, labels, quiz text, branch labels) goes through `substituteNames` — never render raw position tokens.
- Per-position data (`narrative`, `quiz`) is `Partial<Record<Position,string>>` keyed by `selectedPosition`.
- Two nav modes (linear vs branching) chosen by `PlayControls` from `step.branches`.
- `'use client'` on the interactive ones (`PositionSelector`, `NarrativePanel`, `NarrativeWithTooltips`, `QuizPanel`, `PlayPicker`, `PickerDrawer`); the pure layout ones omit it.
