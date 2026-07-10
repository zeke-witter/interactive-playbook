# Dark Athletic HUD Visual Restyle — Design

## Problem

The app currently uses unstyled default Tailwind: white background, black text, plain gray borders, hard corners, system font. It reads as an unfinished prototype rather than a polished product.

## Goal

Restyle the app's UI chrome (everything except the SVG field itself) into a "Dark Athletic HUD" look: near-black surfaces, a lime/chartreuse accent, condensed bold uppercase headings (Oswald), and rounded corners throughout. The field's turf, player tokens, and path/throw visuals are explicitly unchanged — they already look like a field and that's correct; this restyle is chrome only.

## Non-Goals

- No changes to the field's SVG visuals (`FieldBackground`, `PlayerToken`, `ForceIndicator`, `PathPreviews`, `ThrowArc`, `DiscMarker`, `StallCounter`) beyond the frame that contains them.
- No changes to app behavior, data, routing, or component logic — this is styling only.
- No new automated tests (project-wide policy, unchanged).

## Design Tokens

Added to `src/app/globals.css`'s existing `@theme` block (Tailwind v4 CSS-first config — no separate `tailwind.config.js` exists in this project, so this is the idiomatic place):

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0b0d11` | page background |
| `--color-surface` | `#15181f` | cards, list rows, panels |
| `--color-surface-raised` | `#1c2029` | hover state on cards/rows |
| `--color-border` | `#262b35` | default card/input borders |
| `--color-text` | `#f4f4f5` | primary text |
| `--color-text-muted` | `#9aa0ac` | secondary/meta text |
| `--color-accent` | `#a3e635` | buttons, active state, key labels |
| `--color-accent-hover` | `#bef264` | hover/pressed accent |
| `--color-accent-foreground` | `#0b0d11` | text/icon color on top of accent-filled elements |
| `--color-success-bg` | `#132615` | quiz "correct" background |
| `--color-success-border` | `#4ade80` | quiz "correct" border/text |
| `--color-danger-bg` | `#2a1518` | quiz "incorrect" background |
| `--color-danger-border` | `#f87171` | quiz "incorrect" border/text |

These become real Tailwind utilities (`bg-surface`, `text-accent`, `border-border`, etc.) via Tailwind v4's `@theme` mechanism — no arbitrary-value classes needed.

Quiz correct/incorrect deliberately use emerald/rose, not the lime accent — keeps "you got it right" visually distinct from "this is a clickable/active thing," which would be ambiguous if both used lime.

## Typography

- **Oswald** (weights 500/700) for: page/section headings, play names, position labels, button text, step/progress labels. Loaded via `next/font/google` in `src/app/layout.tsx` (not a raw `<link>` tag — avoids layout shift, is the idiomatic Next.js font-loading path) and exposed as a CSS variable (`--font-oswald`) consumed by a new `font-display` Tailwind utility.
- **System sans stack** (existing default, unchanged) for: narrative/quiz body paragraph text. Oswald's condensed caps hurt readability at paragraph length, confirmed during the visual review — this is an intentional two-font system, not an oversight.

## Radius

- `rounded-md` (~8px): buttons, the position-selector dropdown, quiz option buttons, branch-choice buttons.
- `rounded-xl` (~14px): list-item cards on the homepage, the sidebar's panel groupings, the field's outer frame border.
- Progress-step dots: unchanged (`rounded-full`).

This directly addresses the original "hard edges" complaint.

## Scope — Files Restyled

- `src/app/globals.css` — new `@theme` tokens.
- `src/app/layout.tsx` — Oswald font loading via `next/font/google`.
- `src/app/page.tsx` — dark background, restyled play-list cards, lime meta labels, Oswald heading.
- `src/app/plays/[playId]/page.tsx` — dark page background; the field's outer wrapper div gets the `rounded-xl` frame treatment (the `<svg>` and everything inside it is untouched).
- `src/components/sidebar/PlayHeader.tsx` — Oswald heading/labels.
- `src/components/sidebar/PositionSelector.tsx` — dark select styling.
- `src/components/sidebar/NarrativePanel.tsx` / `NarrativeWithTooltips.tsx` — light text on dark surface; tooltip popover restyled dark (already dark in the existing implementation — `bg-gray-900` — confirm it still reads correctly against the new page background and adjust only if needed).
- `src/components/sidebar/StepControls.tsx` — dark surface buttons with accent border/text, lime-active progress dot, and the existing mobile `sticky ... bg-white` swapped to the new surface token (currently hardcoded white, which would look broken against a dark page).
- `src/components/sidebar/QuizPanel.tsx` — dark option buttons; correct/incorrect states swapped from `green-50`/`red-50`/`green-500`/`red-500` to the new `success`/`danger` tokens.
- `src/components/sidebar/BranchChoice.tsx` — dark surface buttons.
- `src/components/sidebar/Sidebar.tsx` — border/background updates to the `<aside>` wrapper only (its children handle their own styling).

## Scope — Explicitly Unchanged

`FieldBackground.tsx`, `PlayerToken.tsx`, `ForceIndicator.tsx`, `PathPreviews.tsx`, `ThrowArc.tsx`, `DiscMarker.tsx`, `StallCounter.tsx` — no changes. The field keeps its natural turf-green look and existing blue/red/white token colors, per explicit design decision.

## Verification

No automated tests (project-wide policy). Verify by running the dev server and driving it with Playwright (already set up in this session): screenshot the homepage and `/plays/flood` before/after, confirm no console errors, confirm the field's SVG content is pixel-identical to before the restyle (same colors/positions — only its surrounding frame changes).
