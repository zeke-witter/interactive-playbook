# Mousetrap Playbook — Design Standards & Context

This doc exists to brief a UI/UX brainstorming session (e.g. Claude Design) on the current state of the app, who it's for, and what "more intuitive" should mean for this round of work. It's context and constraints, not a rulebook — the point is to give whoever's exploring UI approaches everything they'd need to propose changes that actually fit the product, instead of guessing.

## How to use this doc with Claude Design

1. **Attach this doc** (and the screenshots below) to your Claude Design session as reference material — it covers the design system (real color/type tokens) and current-state visuals it asks for.
2. **Link the codebase**: `github.com/zeke-witter/interactive-playbook` (private repo). This lets it see the actual component structure (`src/components/designer/`, `src/components/field/`, `src/components/sidebar/`) instead of just the screenshots.
3. **Work through the prompts below** one at a time rather than all at once — each targets one design principle or open question, and they'll go better as separate conversations/canvases than one giant ask.
4. **Loop back to Claude Code when a direction feels right.** Claude Design can hand a design off to Claude Code directly — bring (or export) whatever you land on back into a session here and I'll turn it into an actual implementation plan against the real components, the same way every other feature in this project has gone from spec to shipped.

## What this product is

Mousetrap Playbook is a two-tool app for an ultimate frisbee team:

- **Play Designer** (`/designer`) — a drag-and-drop field editor for authoring plays: player positions, cutting paths, throws, and branching "what happens if the read is covered" alternatives, step by step.
- **Play Viewer** (`/plays/[playId]`) — the teaching tool players actually use: pick a play, pick your position, animate through it step by step with narrative text explaining your job at each moment.

Drafts built in the Designer get published to the database — to a coach's personal playbook, or submitted to a team where a captain/admin approves them into the shared catalog the Viewer shows.

## Audiences & contexts

**Play Designer:**
- Now: multiple teams and accounts. Coaches/captains sign in (Google), manage their team, and author plays; players see their team's catalog. Still small, so some UX roughness is tolerable — but it's no longer a single-user tool.
- Where this is going: anyone — other coaches, captains, or players on other ultimate teams — should be able to pick this up and build a play without hand-holding. The account/team foundation is in place; keep designing toward broad self-serve use.
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
- Backend is **Supabase** (Postgres + Auth); plays, drafts, teams, memberships, and roster names live in the database, authored via server actions under RLS and deployed on Vercel — production is fully interactive. Multi-user, multi-team editing with accounts **is** in scope. What's still out of scope: live real-time collaboration (no simultaneous co-editing of one play, no presence) — design for per-user/per-team persistence, not Google-Docs-style co-presence.
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

## Ready-to-use prompts

One prompt per design principle and per open question, meant to be pasted into Claude Design as-is (attach this doc + the screenshots first so the color/type tokens and current layout are already in context). Each is scoped to one topic on purpose — work through them as separate explorations rather than one combined ask.

### 1. Whiteboarding-tool conventions (Designer)

```
Redesign the Play Designer's canvas and toolbar to feel immediately
familiar to someone who has used Figma, Miro, Excalidraw, or Google
Jamboard, even if they've never seen this specific tool before.

Goal: cut onboarding friction to near zero for a future audience of
ultimate frisbee coaches and captains who are not professional
designers, but likely have some passing experience with a
whiteboarding or slide tool.

Current layout: see designer-desktop-position-mode.png and
designer-branching.png. Current interactions: mode-switching via a
button row (Position / Draw Path / Mark Throw), a text-based step-tree
list for navigating steps and branches, drag gestures for drawing a
cutting path and for marking a throw.

Keep: the step-based authoring model (a play is a sequence of
steps/branches, not freeform layers), the existing dark color system,
and both drag gestures already in place.

Propose 2-3 layout directions that borrow established conventions
(tool rail placement, canvas pan/zoom, selection/multi-select
affordances, alignment or spacing guides) for organizing the canvas
and controls, without changing what the tool fundamentally does.
```

### 2. Mobile-first as a mental model (Designer)

```
Audit every interaction in the Play Designer as if it had to work by
touch on a tablet, even though it only needs to support mouse today.

Goal: validate (or challenge) the two interactions already built with
this lens in mind — click-and-drag to draw a cutting path, and
press-and-drag from the disc holder to mark a throw (see
designer-mark-throw-mode.png) — and propose how the remaining
interactions (selecting a player, switching modes, navigating the step
tree, adding a branch) would need to change to hold up under touch,
without breaking how they work with a mouse right now.

Audience: same as above — non-designer coaches/captains, likely on a
laptop today but possibly a tablet in the future.

Content: walk through each of the three modes (Position, Draw Path,
Mark Throw) and the step-tree/branch-management UI, and flag anything
that currently depends on hover, right-click, or a small tap target
that would fail on touch.
```

### 3. Discoverability through convention (Designer)

```
Design a first-time-use experience for the Play Designer that needs
no onboarding, tutorial, or tooltip walkthrough for someone who has
used a whiteboarding tool before.

Goal: a brand-new coach with zero context should be able to look at
the empty/default state and correctly guess how to place a player,
draw a path, and mark a throw, purely from visual convention.

Current state: designer-desktop-position-mode.png shows the default
(empty-ish) canvas and the current toolbar. Current mode labels are
literally "Position" / "Draw Path" / "Mark Throw."

Propose: an empty-state / first-run layout, and any changes to
labeling, iconography, or affordances (e.g. cursor states, hover
hints) that make the three modes and the step-tree self-explanatory
without added instructional text.
```

### 4. Continuous, specific visual feedback (Designer + Viewer)

```
Design a complete visual "state language" for both the Play Designer
and Play Viewer: hover, selected, draggable, dragging, disabled,
confirmed/success, and error/destructive states.

Goal: at any moment, a user should be able to tell what's interactive,
what's currently selected or active, and what just happened, at a
glance, without reading text.

Design system: dark theme, background #0b0d11, surface #15181f,
border #262b35, text #f4f4f5 / muted #9aa0ac, accent lime #a3e635,
success green #4ade80, danger red #f87171. Oswald for
headers/labels, Geist Sans for body.

Current examples already using this pattern: a colored ring around
the currently-selected or active field token (accent = holder, white
= live drag-hover target, green = confirmed receiver — see
designer-mark-throw-mode.png), and small pill-shaped status chips
like "Has disc" / "Receiving disc."

Propose a small, consistent component set (buttons, chips, rings,
disabled states) that covers both tools, building on the existing
color meanings rather than introducing new ones.
```

### 5. Touch/pointer support for tablets (open question)

```
Propose a concrete touch interaction spec for the Play Designer's two
drag gestures, assuming a future tablet target.

Goal: answer whether "click and drag to draw a path" and "press and
drag from the disc holder to mark a throw" (designer-mark-throw-mode.png)
translate directly to touch, or need adjustment — e.g. for the case
where a finger obscures what it's dragging, or where a hover-preview
state (used today to highlight a potential throw receiver while
dragging) has no true equivalent on touch.

Content: cover at minimum: starting a drag from a small circular
token, seeing a live preview of a not-yet-committed path or throw
target, and canceling a drag partway through.
```

### 6. What "quiz mode" should look like (open question)

```
Brainstorm 2-3 concrete concepts for how quizzing could work in the
Play Viewer as a separate, optional thing — not blocking the main
step-through flow the way it used to.

Goal: today, stepping through a play is Prev/Next plus narrative text
per position (see viewer-desktop.png, viewer-mobile.png). Quizzing
used to gate the "Next" button with a question; that's being removed.
Propose how quizzing could return without that blocking behavior —
options might include a separate mode/route entered deliberately, an
end-of-play recap, or per-step optional questions that never block
progress.

Audience: players reviewing a play on their own time (phone, tablet,
or desktop), not in a live game context.
```

### 7. Does the account/team model constrain the UI? (open question)

```
The app is now multi-user and multi-team on Supabase (Google
accounts, per-team catalogs, submit→approve publishing, per-user
drafts, RLS). Sanity-check whether any UI direction from the other
prompts assumes capabilities that still don't exist — e.g. real-time
co-editing of one play, live presence, sharing a single draft between
users, or cross-team play sharing.

Goal: flag anywhere a proposed design implies functionality the app
doesn't have yet, and note whether that's a reason to simplify now or
to flag as a near-term follow-up. Persistence, accounts, roles, and
team catalogs are fair to assume; simultaneous co-editing / presence
is not.
```
