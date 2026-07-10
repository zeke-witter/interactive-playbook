# Position Name System — Design

## Problem

Field tokens and all narrative/quiz/label text currently show technical position codes (H1-H3, C1-C4). The team wants real player names shown instead, respecting the sport's mixed-gender roster rules — while keeping the technical position codes as the underlying data model, since the whole app (types, play data, narrative authoring) is built around them.

## Goal

Randomly assign real names to the 7 positions each time a play loads, respecting MMP/FMP ratio rules, and substitute those names everywhere technical position codes currently appear in the UI — field tokens, narrative, quiz text, step labels, and the position selector — while the *other* team (not the play's own category) gets generic, non-named labels.

## Non-Goals

- No changes to play data (`PlayStep`/`Play` types, coordinates, branching, quizzes) — this is a display-layer feature layered on top of the existing position-code system.
- No persistence — a fresh roster is drawn every time a play page loads (matches "randomly choose a ratio when loading a play"); switching plays or reloading gets a new roster.
- No UI to manually override an assigned name — pure randomization for now.

## Name Bank

`src/data/names.ts` — the four arrays as given, verbatim:

```typescript
export const MMP_CUTTER_NAMES = ['Kwast', 'Pizzo', 'BP', 'Alex', 'Tyler', 'Gabe', 'Diva', 'Zork', 'Spencer']
export const FMP_CUTTER_NAMES = ['Cameo', 'Elfie', 'Marv', 'Abi', 'Izzie', 'Olivia', 'Kaden', 'Veiga', 'Emily', 'Mary', 'Nicole']
export const MMP_HANDLER_NAMES = ['Zeke', 'TJ', 'Kevin', 'Zach', 'Erik', 'Dylan', 'Matthew']
export const FMP_HANDLER_NAMES = ['Catherine', 'Lily', 'Rani']
```

## Roster Generation

A `useRoster()` hook (`src/hooks/useRoster.ts`), called once per play-page mount via `useState`'s lazy initializer (guarantees exactly one random draw per mount, unlike `useMemo`, which is only an optimization hint):

1. Coin-flip the cutter ratio: 50% chance of 2 MMP + 2 FMP cutters (overall team ratio 4:3), 50% chance of 1 MMP + 3 FMP cutters (overall ratio 3:4). Handlers are always 2 MMP + 1 FMP, confirmed fixed regardless of ratio — the swing lives entirely in the cutters, which is the only way the stated overall ratios are arithmetically possible with fixed handlers.
2. Draw unique names (no repeats) from the relevant bank for each slot needed, shuffle, and assign to `C1`-`C4` and `H1`-`H3`.
3. Return `Record<Position, string>` — one name per position, stable for the lifetime of the mounted play page.

## Labeling Rule

Reuses the `dimmed` computation already in `PlayerTokens.tsx` (`dimmed = player.isDefense ? category === 'offense' : category === 'defense'` — true for whichever team is *not* the play's own category):

| Token | `dimmed` | Label |
|---|---|---|
| Focus team (matches `play.category`) | false | Roster name |
| Defender, non-focus team | true | Deterministic generic: `D1`-`D4` (cutter-guarding, by position) / `D5`-`D7` (handler-guarding) |
| Offense, non-focus team (i.e. offense shown on a defense play) | true | Plain position code (`C1`-`C4`/`H1`-`H3`) — unchanged from today |

The generic defender labels are a fixed lookup table, not randomized — they always map the same way (e.g. the defender guarding C3 is always `D3`).

## Substitution Scope

A single utility, `substituteNames(text, roster)` in `src/lib/names.ts`, replaces whole-word occurrences of `C1`-`C4`/`H1`-`H3` in a string with the roster's assigned names (regex word-boundary match, same technique already used for glossary terms in `NarrativeWithTooltips`). Applied to:

- Field token labels (via the labeling rule above)
- Narrative text (before glossary tokenization — substitution runs first, then the existing glossary-term wrapping runs on the result)
- Quiz question, options, and explanation text
- Step labels (e.g. "C1 Cuts Upfield and Curls Under" → the assigned name)
- The position-selector dropdown's *displayed* option text (the `value`/`onChange` still carry the real `Position` code, since that's what the rest of the app keys off of — only the visible label changes)

## Component Changes

- `src/data/names.ts` — new, the four arrays above.
- `src/lib/names.ts` — new, `substituteNames()` and the fixed `GENERIC_DEFENDER_LABELS` lookup.
- `src/hooks/useRoster.ts` — new, the roster-generation hook.
- `src/components/field/PlayerTokens.tsx` — computes each token's display label per the labeling rule, passes it to `PlayerToken` as a new `label: string` prop (replacing `PlayerToken`'s internal `{player.id}` render).
- `src/components/field/PlayerToken.tsx` — renders the passed-in `label` instead of `player.id`.
- `src/app/plays/[playId]/page.tsx` — calls `useRoster()`, passes `roster` down to `FieldCanvas` (→ `PlayerTokens`) and `Sidebar`.
- `src/components/sidebar/Sidebar.tsx` — threads `roster` to `PlayHeader`, `PositionSelector`, `NarrativePanel`, `QuizPanel`.
- `src/components/sidebar/PlayHeader.tsx` — applies `substituteNames` to `stepLabel`.
- `src/components/sidebar/PositionSelector.tsx` — renders `substituteNames(pos, roster)` as each option's label, keeps `value={pos}`.
- `src/components/sidebar/NarrativePanel.tsx` / `NarrativeWithTooltips.tsx` — applies `substituteNames` to the narrative text before glossary tokenization.
- `src/components/sidebar/QuizPanel.tsx` — applies `substituteNames` to `question`, each option, and `explanation`.

## Verification

No automated tests (project-wide policy). Verify manually: load a play several times and confirm the ratio/names change each load; confirm handler count is always 2-named-MMP-pattern + 1-named-FMP-pattern; confirm no duplicate names within one roster; confirm defenders on an offense play show `D1`-`D7` consistently tied to who they're guarding; confirm a defense play (2-3-2 Zone D) shows names on defense and plain codes on offense; confirm narrative, quiz, step labels, and the position dropdown all show names, with no leftover raw position codes in visible text on the focus team's side.
