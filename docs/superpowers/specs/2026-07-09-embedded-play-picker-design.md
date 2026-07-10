# Embedded Nested Play Picker + Entrance Polish — Design

## Problem

Two related issues from user feedback:
1. Field elements looked like they were sliding into the field from nowhere on initial load — already diagnosed and fixed separately (`PlayerToken` had no `initial` prop, so Framer Motion animated every token in from the untransformed origin; fixed with an in-place pop + per-token stagger, confirmed via video, committed in `c4ce277`).
2. The narrative panel is cramped relative to the large empty space below it, and the app requires a full navigation away from the play viewer (`/`) just to browse other plays.

## Goal

- Increase narrative text size to use more of the available space.
- Replace the standalone `/` homepage with an always-available nested play picker embedded in the sidebar, between the narrative/quiz block and the Prev/Next controls.
- `/` becomes a redirect to a default play rather than a separate page.

## Non-Goals

- No changes to field visuals, the pop-in fix, or inter-step animation (already done).
- No new plays, categories, or sets — the picker just organizes whatever `ALL_PLAYS` already contains.
- No changes to `usePlayStep`, branching, or quiz logic.
- Building the eventual onboarding/explainer "default play" — `/` redirects to `flood` for now; swapping the default later is a one-line change (see Route Change below), not part of this work.

## Narrative Text

`text-base` → `text-lg` in both `NarrativePanel`'s fallback paragraph and `NarrativeWithTooltips`' main paragraph. `leading-relaxed` stays as-is — the larger size alone provides the "slightly looser" feel requested.

## Route Change

`src/app/page.tsx` stops rendering a play list and instead redirects:

```tsx
import { redirect } from 'next/navigation'
import { DEFAULT_PLAY_ID } from '@/data/plays'

export default function HomePage() {
  redirect(`/plays/${DEFAULT_PLAY_ID}`)
}
```

`DEFAULT_PLAY_ID` is a new named export from `src/data/plays/index.ts` (currently `'flood'`) so swapping the default later (e.g., to a future onboarding play) is a one-line change in one file, not a hunt through the codebase.

The play list, and the per-play "N/7 positions learned" progress readout that used to live on this page, move into the picker's leaf (plays) view — see below. `useProgress` continues to be used, just from a new location.

## Picker Design

**Data:** grouped from the existing `ALL_PLAYS` array by `category` → `set`, using a new pure helper in `src/data/plays/index.ts`:

```ts
export function categoriesWithPlays(): Play['category'][] {
  return Array.from(new Set(ALL_PLAYS.map((p) => p.category)))
}

export function setsInCategory(category: Play['category']): Play['set'][] {
  return Array.from(new Set(ALL_PLAYS.filter((p) => p.category === category).map((p) => p.set)))
}

export function playsInSet(category: Play['category'], set: Play['set']): Play[] {
  return ALL_PLAYS.filter((p) => p.category === category && p.set === set)
}
```

Categories/sets with zero plays are simply absent from these results — Defense (currently empty) won't show up until a defense play exists. No empty-state UI needed.

**Component:** new `src/components/sidebar/PlayPicker.tsx`, a client component holding its own `{ view: 'categories' | 'sets' | 'plays', category?, set? }` state.

- **Default state:** initialized to the `plays` view for the *current* play's own category/set — so opening the picker shows you where you already are, not a reset to the top. Tapping an earlier breadcrumb crumb (e.g. "Plays" or the category name) drills back up.
- **Breadcrumb:** small uppercase trail above the list — `Plays › Offense › Pull Play`, each earlier segment a clickable button, the current (deepest) segment plain text.
- **Leaf list (plays view):** each play is a button showing its name and `{completedCount(play.id)}/7 positions learned` (moved here from the old homepage, via the existing `useProgress` hook); the currently-viewed play is visually distinguished (accent border/text) rather than just another identical row.
- **Navigation:** selecting a play calls `router.push('/plays/' + playId)` (`next/navigation`'s `useRouter`). Since this is a different route, `PlayPage` remounts fresh — step index resets to 0, position resets to `H1` — which is the correct behavior for switching plays.

**Placement:** rendered in `Sidebar.tsx` between the narrative/quiz block and the branch-choice-or-step-controls block, so on mobile the sticky Prev/Next bar stays pinned at the very bottom and the picker lives in the scrollable middle area above it.

## Verification

No automated tests (project-wide policy). Verify manually: `/` redirects to `/plays/flood`; the picker on `/plays/flood` opens already showing "Plays › Offense › Pull Play" with Flood highlighted; drilling up to categories and back down to a different play (e.g. Ho Stack) navigates correctly and resets step/position state; the progress count per play matches what the old homepage used to show; narrative text is visibly larger.
