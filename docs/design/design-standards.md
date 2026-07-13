# Mousetrap Playbook — Design Standards & Context

This doc exists to brief a UI/UX brainstorming session (e.g. Claude Design) on the current state of the app, who it's for, and what "more intuitive" should mean for this round of work. It's context and constraints, not a rulebook — the point is to give whoever's exploring UI approaches everything they'd need to propose changes that actually fit the product, instead of guessing.

## What this product is

Mousetrap Playbook is a two-tool app for an ultimate frisbee team:

- **Play Designer** (`/designer`) — a drag-and-drop field editor for authoring plays: player positions, cutting paths, throws, and branching "what happens if the read is covered" alternatives, step by step.
- **Play Viewer** (`/plays/[playId]`) — the teaching tool players actually use: pick a play, pick your position, animate through it step by step with narrative text explaining your job at each moment.

Drafts built in the Designer get promoted (currently by hand, with Claude's help) into real, published plays the Viewer can show.

## Audiences & contexts

**Play Designer:**
- Today: just the one coach (the person reading this), and it's fine for the UX to be a little rough while that's true.
- Where this is going: eventually anyone — other coaches, captains, or players on other ultimate teams — should be able to pick this up and build a play without hand-holding. That's the real target to design toward, even though the current single-user phase tolerates some sharp edges.
- Device: primarily desktop/laptop today. No stated requirement to support touch yet, but see "mobile-first mindset" below — that's a design lens, not a device requirement.

**Play Viewer:**
- Players learning/reviewing plays. Explicitly **not** used mid-game or mid-huddle — this is a study tool, used before or after the fact, not in the moment.
- Must work well across the full device range: phones, tablets, and larger screens. No single device is primary; all three are real contexts.

## Core user flows (current scope)

**Designer:**
1. Build a play: place players (Position mode), draw cutting paths (Draw Path mode, click-and-drag to place waypoints), mark throws (Mark Throw mode, drag from the disc holder to the receiver).
2. Add steps (duplicates the current step, auto-advancing anyone with a drawn path to that path's end); branch into alternatives at any step.
3. Save/load/delete named drafts; start over with "New Play"; full undo/redo.
4. Preview: walk through the play with real animated transitions before saving, choosing live at any branch point.

**Viewer:**
1. Pick a play from a category → set → play picker.
2. Pick your position (dropdown, or click yourself directly on the field).
3. Step through the play (Prev/Next), reading narrative text specific to your position at each step.

**Quizzes are explicitly out of scope for this round.** The app has quiz UI already built (a question/answer check gating "Next"), but it's being pulled out of the main flow for now — a separate "quiz mode" or targeted quizzes may come later as their own thing. Don't design around quizzes blocking the main step-through experience.

## Current visual language

Dark theme throughout. Real values from `src/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0b0d11` | page background |
| `--color-surface` | `#15181f` | card/panel background |
| `--color-surface-raised` | `#1c2029` | slightly-elevated panel |
| `--color-border` | `#262b35` | default borders |
| `--color-text` | `#f4f4f5` | primary text |
| `--color-text-muted` | `#9aa0ac` | secondary text |
| `--color-accent` | `#a3e635` (lime) | primary actions, active states |
| `--color-accent-hover` | `#bef264` | accent hover |
| `--color-success-border` | `#4ade80` (green) | confirmed/positive state |
| `--color-danger-border` | `#f87171` (red) | destructive/error state |

Typography: **Oswald** (`--font-display`) for headers/labels, **Geist Sans** for body text.

Field rendering: inline SVG, offense tokens filled blue (`#2563eb`), defense filled red (`#dc2626`), both circles with a bold white position label.

## Established interaction patterns

These already exist and work — new proposals should build on them intentionally, not reinvent them by accident:

- **Buttons:** outline style (`border-accent text-accent`) for secondary/toggle actions, filled (`bg-accent text-accent-foreground`) for the primary action in a group. Disabled state: `opacity-40 cursor-not-allowed`.
- **Status chips:** small pill-shaped badges (`rounded-full border px-2 py-1 text-xs`) for transient state, e.g. "Has disc" / "Receiving disc" — colored by meaning (accent = active role, green = confirmed), with an inline `×` to remove when applicable.
- **Confirm-before-destroy:** every irreversible action (delete step, delete branch, delete draft, start a new play) gets a native `confirm()` dialog first, even though most of these are now also undoable.
- **Drag-to-act, not click-click:** the two biggest interaction wins this project has had both replaced a multi-click flow with a single drag gesture — drawing a path (click token, drag/click waypoints, confirm) and marking a throw (press-and-drag from the disc holder to the receiver, with live hover highlighting). This is the direction that's worked; anything that can be "point at what you mean" instead of "click A, then click B" is preferred.
- **Full undo/redo:** every content-mutating action in the Designer is on one linear undo/redo stack (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, plus toolbar buttons), including step/branch structure changes and "New Play." Position-drag gestures coalesce into one undo step per drag, not one per pixel of movement.
- **Selection rings, not repainted tokens:** the currently-selected/active token gets a colored ring around it rather than changing its own fill — holder = accent ring, live drag-hover target = white ring, confirmed receiver = green ring.

## Known friction points (already found and fixed once — good candidates to look at again with fresh eyes)

- Mark Throw's original click-then-click flow wasn't discoverable — "doesn't seem to do anything" was the actual user report, before it became a drag gesture.
- No way to discard/reset an in-progress play — had to manually delete every step. Added an explicit "New Play."
- Save/load felt scattered (Save form at the bottom, draft list elsewhere) until grouped into one labeled "Play File" section.
- Editing a single drawn path required deleting the whole step and starting over, until a per-path "Remove" list was added.
- Switching your POV in the Viewer required the dropdown every time — clicking yourself directly on the field was requested as more intuitive and just shipped.
- A step's timing (e.g. "this cutter waits for those cutters to clear before moving") had no dedicated mechanism — resolved by just using more steps rather than adding new timing UI, which turned out to be the simpler, more legible answer.

## Constraints

- Hobby project: no dedicated design team or budget, one developer (with Claude's help) implementing.
- Must be buildable in the current stack: Next.js App Router, Tailwind v4, Framer Motion, inline SVG (no canvas/WebGL).
- No backend/database — content is file-based (drafts and plays are JSON/TypeScript files on disk), authored locally and deployed as a static-ish Vercel site. Any UI that implies live multi-user editing or persistence beyond "the person running it locally" is out of scope for now.
- No automated tests (explicit project policy) — UI changes get verified by hand/live browser check, not a test suite.

## Design principles for this round

1. **Borrow from familiar whiteboarding/diagramming tools.** The Designer should feel recognizable to someone who's used Figma, Miro, Excalidraw, or similar — established conventions for selection, drawing, grouping, and canvas navigation over bespoke ones. Familiarity here directly serves the "eventually anyone can pick this up" goal.
2. **Mobile-first as a mental model, not (yet) a device requirement.** There's no touch support today, but design as if there will be: imagine the simplest way a person would touch an element to do what they want, then map that onto mouse interaction. The click-and-drag path drawing and the drag-to-throw gesture are both examples of this already paying off — they'd translate to touch almost unchanged.
3. **Discoverability through convention, not onboarding.** If the tool behaves like the whiteboarding tools people already know, it needs less explaining. Prefer "looks and acts like what you'd expect" over a novel interaction that then needs a tooltip to explain.
4. **Continuous, specific visual feedback.** Every mode and every action should make its current state legible at a glance — what's selected, what's draggable, what just happened, what's about to happen. This has been the throughline of every fix in "Known friction points" above.

## Reference screenshots

Current state, captured alongside this doc, in `docs/design/screenshots/`:

- `designer-desktop-position-mode.png` — Designer, default Position mode, desktop
- `designer-mark-throw-mode.png` — Designer, Mark Throw mode (the drag-to-target gesture)
- `designer-branching.png` — Designer with a branching play loaded, showing the step tree
- `viewer-desktop.png` — Viewer, desktop
- `viewer-tablet.png` — Viewer, tablet portrait
- `viewer-mobile.png` — Viewer, phone

## Open questions worth raising in the brainstorming session

- Should the Designer eventually get real touch/pointer support for tablets, given the mobile-first design lens already being applied?
- What should "quiz mode" actually look like once it returns — a separate route, a toggle within the Viewer, something else?
- As the Designer's audience widens beyond one person, does anything about the current file-based (no accounts, no sharing) model need to change, or does that stay out of scope for the UI work specifically?
