# Handoff: Play Designer & Play Viewer UI/UX Improvements

## Overview
A set of layout and interaction changes for Mousetrap Playbook's two tools: the Play Designer (`/designer`) and the Play Viewer (`/plays/[playId]`). Covers a whiteboarding-tool-style Designer layout, its mobile adaptation, a shared visual state language, first-run discoverability, a Viewer layout-shift bug fix, a new Designer file switcher, and a touch-safe replacement for Mark Throw's hover highlight.

## About the Design Files
The attached `Designer Layout Options.dc.html` file is a **design reference built in HTML** — a set of static, non-interactive mockups (option ids 1a, 2a, 3a, 4a/4b, 5a/5b, 6a/6b, 7a/7b) showing intended layout, states, and copy. It is not production code. The task is to **recreate these designs inside the existing Next.js / Tailwind v4 / Framer Motion / inline-SVG stack**, following the component structure already in `src/components/designer/`, `src/components/field/`, and `src/components/sidebar/`, not to port the HTML directly.

## Fidelity
**High-fidelity for layout, spacing, and color** (all values below come directly from `src/app/globals.css`, no new colors introduced). **Low-fidelity for exact pixel positions** — the mockups were built at illustrative scale, not to the app's real field/token pixel geometry. Use the real field SVG's existing coordinate system; match the *structure and states* described here, not literal x/y values from the mockup.

## Decisions made (what to build)

### 1. Designer layout — direction 1a (option 1b was explored and rejected)
Reorganizes the existing panel-based Designer around whiteboarding-tool conventions, keeping the step-based authoring model, dark palette, and both existing drag gestures unchanged.
- **Top bar** (50px, `--color-surface-raised` bg, bottom border `--color-border`): app wordmark "MOUSETRAP" (Oswald, 600, 13px, letter-spacing .06em) + "/" + a **file name chip** (see File Switcher below) + spacer + Undo/Redo icon buttons (30×30, outline style) + divider + filled accent "▶ Preview" button.
- **Left tool rail** (64px wide, `--color-surface` bg, right border): 3 stacked icon buttons, 44×44, rounded 8px. Each shows a simple glyph (filled circle = Position, dashed line + dot = Draw Path, ring + center dot = Mark Throw) with an 8.5px label underneath. Active tool = filled `--color-accent` background with dark icon/label; inactive = transparent background, muted icon/label (`--color-text-muted`).
- **Canvas**: darker background (`#0d0f13`, slightly darker than page bg for contrast against the field), field centered. A mode-specific hint pill (rounded 20px, `--color-surface-raised` bg, accent border) floats at top-center, text changes per active tool (e.g. "Click and drag any player to reposition" / "Click a player, then click to lay path waypoints" / "Click and drag disc to the receiver").
- **Right panel** (260px, `--color-surface` bg, left border): "FORMATION" section (Offense/Defense + stack-type selects, matching existing selects), then a "STEPS" section rendered as a **connected vertical tree** — a vertical line connects step nodes (rounded rect chips, `--color-surface-raised` bg), selected step gets accent border; branches indent under their parent step with a horizontal connector line and a small condition label above each branch (accent-colored for the "good" outcome, danger-red for a "reset/covered" outcome, per existing example copy "C1 GETS OPEN DEEP" / "C1 IS COVERED, RESET"). "+ Add Branch" button (dashed accent border) at the bottom.
- Replaces today's separate always-visible "PLAY FILE" + "LOAD DRAFT" sections in the sidebar (see File Switcher, item 6, for the replacement).

### 2. Mobile adaptation of 1a
- **Top bar** shrinks to 46px; same file chip + Undo + Preview, tool rail and right panel are removed from view.
- **Bottom tab bar** (64px, `--color-surface-raised` bg, top border) replaces the left tool rail: 3 tools as 44×44 buttons in a row, same active/inactive treatment as desktop, labels below each icon.
- **Step sheet**: a swipe-up sheet replaces the right panel. Collapsed state shows a 62px peek strip directly above the tab bar: small step thumbnails (36×36) + a text summary ("Step 3 of 3, 2 branches ▴"). Dragging the sheet up reveals the full formation + branch tree from 1a.
- All tap targets ≥44×44px.

### 3. Shared state language (applies to both tools)
One state model reused everywhere, using only the existing 5 semantic colors (no new colors):
- **Tool rail / tab bar buttons**: default = transparent bg, muted icon. Hover (desktop only) = `--color-surface-raised` bg, `--color-border` outline, full-white icon. Active tool = `--color-accent` fill, dark icon/label. Disabled = 40% opacity, `cursor: not-allowed` (existing pattern).
- **Field tokens**: default = existing blue/red fill + white 2px border. Hover = add a soft white ring (`box-shadow: 0 0 0 3px rgba(244,244,245,.25)`). Selected/holder = solid accent ring (`--color-accent`, existing pattern). Dragging = solid white ring at full opacity + slight opacity drop on the token itself. Confirmed receiver = solid green ring (`--color-success-border`, existing pattern).
- **Step/branch chips**: default = `--color-surface-raised` bg, `--color-border` border. Hover = lighter border (`#3a4152`). Selected = `--color-accent` border. Destructive action (Remove/Delete) = text turns `--color-danger-border` red, but only on row hover — stays neutral by default so lists don't read as alarming.
- **Status chips**: unchanged from existing pattern (`rounded-full`, `border`, `px-2 py-1`, `text-xs`), colors keep their existing meanings (accent = active role, green = confirmed, red = destructive/unsaved warning).

### 4. First-run discoverability (empty/new-play state only)
- **Desktop**: Position mode is selected by default (already true today). A single dismissible coach-mark bubble reads "Position is on: drag any player to set up your formation. Switch tools on the left when you're ready to draw or throw." A dashed accent-colored line with a properly-oriented arrowhead (use an SVG `<marker>` with `orient="auto"` so the arrowhead always aligns to the line's actual direction — do not hand-rotate a separate polygon) points from the bubble to the Position button in the tool rail, stopping short of the button rather than overlapping it. Dismiss permanently after the user's first successful drag (store a flag, e.g. `localStorage`).
- **Mobile**: same message, rephrased for touch ("drag any player with your finger"), arrow points down at the bottom tab bar instead of sideways at a rail. No hover-triggered tooltips anywhere in the touch version — every hint is either always-visible text or the same one-time dismissible mark.
- The empty right panel / step sheet shows a placeholder inside the Step 1 slot: "This is where it starts, add a step once you're happy with the setup" (dashed accent border box).

### 5. Viewer fix — Prev/Next layout shift ("bounce")
**Root cause**: Prev/Next and the progress dots sit directly below the narrative paragraph, so their vertical position changes with narrative text length.
**Fix — desktop**: restructure the right-hand panel as a flex column: header + "You are" selector (fixed height, unchanged) → narrative area set to `flex: 1; min-height: 0; overflow-y: auto` with top/bottom dividers → **footer** (flex: none) containing Prev/Next + progress dots, always at a fixed position regardless of narrative length → the existing breadcrumb-driven play picker (see current behavior below) goes below the footer, in its own `max-height` scrollable block, so it also never disturbs the footer's position.
**Fix — mobile**: keep the field a fixed height, put "You are" + narrative + edit-narrative link in a `flex: 1; overflow-y: auto` scrolling region, and **dock Prev/Next to a fixed-height bar pinned to the bottom of the screen** (flex: none), outside the scrolling region. Buttons are 44px+ tall.
**Do not change**: the existing breadcrumb play-picker behavior. Confirmed with the user (see attached screenshots in this repo's `uploads/` if available) that clicking a breadcrumb ("Plays" / a category name) expands a list of plays/sets **inline, in place**, not via navigation to a separate page — this is the correct existing pattern and should be preserved exactly, just repositioned below the new fixed footer. On mobile, the hamburger/menu icon opens a full-height drawer with the same inline breadcrumb-picker behavior; keep that drawer pattern, but the menu button itself should sit inline in the header row next to "MOUSETRAP PLAYS" (not floating over the field).
**Menu icon shape**: rounded square (8px radius), not a circle.

### 6. Designer file switcher
Replaces today's always-visible "PLAY FILE" (name + Save) and "LOAD DRAFT" (list) sidebar sections with a single entry point: the file name chip in the top bar (see item 1).
- **Desktop**: clicking the chip opens a popover anchored below it (280px wide, `--color-surface-raised` bg, rounded 10px, drop shadow). Contents, top to bottom: "PLAY NAME" label + editable name input (pre-filled with current name) + "Save" button inline to its right; divider; "DRAFTS" label + scrollable list of drafts (each row: name + either "current" label for the active draft, or a "Delete" action revealed per-row); divider; dashed-border "+ New Play" button.
- **Mobile**: same content, presented as a full-height drawer (reusing the existing "✕ Close" + content pattern already used for the Viewer's play-picker drawer) instead of a popover. Rows are 44px+ tall.
- Deleting a draft still goes through the existing native `confirm()` dialog (per the project's confirm-before-destroy convention) — this mockup doesn't show that dialog, but it must still fire.
- The current/active draft cannot be deleted from this list (no Delete action shown on its row).

### 7. Mark Throw: touch-safe replacement for the hover highlight
**Root cause**: today, dragging the disc highlights whichever token the mouse is hovering over. Touch input has no hover state, and a dragging finger also physically covers whatever is directly underneath it.
**Fix (applies to both mouse and touch, same code path)**:
- While dragging the disc, highlight the single **nearest** eligible token within a fixed catch radius (desktop: tighter radius, appropriate for pointer precision; mobile: more generous radius, appropriate for fingertip imprecision) — not the token literally under the pointer. Draw the catch radius as a dashed circle around the candidate for the mockup's sake only; it does not need to render in production, just the resulting highlight ring does.
- Highlight ring for the live "would-drop-here" candidate = white ring (existing convention, unchanged in meaning) using the same visual weight as before.
- On touch specifically, render the dragged disc **offset above the actual touch point** (with a soft shadow marking the real touch position underneath), so the disc visual and the highlight target are never hidden by the finger. On desktop this offset is not needed since the mouse cursor doesn't obscure anything; only apply it for touch input.
- Releasing on the highlighted candidate confirms it with the existing green "confirmed receiver" ring.
- Draw Path's existing multi-tap waypoint flow (tap to place each point, then explicit "Finish Path" / "Cancel" buttons) was reviewed and needs **no changes** — it already works well for touch since it's discrete taps rather than a continuous drag.

### 8. First-time Designer walkthrough (guided tour)
A step-required tour (the user must perform the real action to advance, no passive video) built from a real play, "flood," recreated beat by beat. Auto-shown on first visit to the Designer; always reachable again via a "?" button placed next to Undo/Redo in the top bar.
- **Step 1 — Formation.** Pick Offense + Ho Stack. Note for engineering: selecting a formation auto-populates all 14 players (7 offense, 7 defense) at their default spots, there is no manual placement step.
- **Step 2 — Disc holder.** Select a player, then click the separate **"Set as Disc Holder"** button that appears near the selection, this is a distinct action from selecting a player, not a side effect of selection.
- **Step 3 — Draw Path.** Select a player, click to lay waypoints, confirm with **Finish Path** (or **Cancel**). No per-waypoint confirmation, only a single confirm at the end of the whole path, matches existing behavior.
- **Step 4 — What "New Step" actually does.** A plain-language explainer (new content, not tied to a specific play beat): players with a drawn path auto-run that path when you advance to a new step; every other player holds their exact position unless you drag them manually. Tells the user to draw the cuts they want, reposition anyone else by hand, then click New Step.
- **Step 5 — Branching.** Introduces branching using the play's own "Read the Defense" branch point. Two tips called out here: (a) add a fresh, no-change step before branching from it, so every branch starts from the same clean position, and (b) branch/step labels should be written using token IDs (e.g. "Throw the under to C1"), the app automatically swaps token IDs for real player names when a play is published, so authoring can stay ID-based.
- **Step 6 — Mark Throw.** Drag the disc to the receiver. Tip: isolate a throw on its own step if nothing else is moving at the same time; if a cut happens simultaneously with the throw, draw that path on the same step instead of splitting it.
- **Chrome shown per step (desktop):** top bar (file name dropdown, Undo/Redo, Preview), left tool rail with the active tool highlighted, canvas with the mode hint pill, and a right-hand context panel (Formation controls on step 1, Steps list elsewhere). This is the widescreen desktop layout, not the narrow single-column fallback the app also has, the tour should always run in the full desktop chrome at desktop widths.
- **Chrome shown per step (mobile):** same beats, top bar, field, and the bottom tool tab bar from item 2's mobile layout (this mockup adds a fourth tab, **"Select,"** present in the live app but missing from earlier mockups, carry it into the redesigned Designer too). Set as Disc Holder and Draw Path's Cancel/Finish Path render as 44px controls positioned over the field itself (not the bottom bar), so they stay reachable mid-interaction.
- Dismissible at any point.

## Design Tokens (all pre-existing, from `src/app/globals.css` — no new colors)
- `--color-bg`: `#0b0d11`
- `--color-surface`: `#15181f`
- `--color-surface-raised`: `#1c2029`
- `--color-border`: `#262b35`
- `--color-text`: `#f4f4f5`
- `--color-text-muted`: `#9aa0ac`
- `--color-accent`: `#a3e635`
- `--color-accent-hover`: `#bef264`
- `--color-success-border`: `#4ade80`
- `--color-danger-border`: `#f87171`
- Offense token fill: `#2563eb`. Defense token fill: `#dc2626`. Both: 2px white border, bold white label.
- Fonts: Oswald (headers/labels), Geist Sans (body) — both already in use, no change.
- Minimum touch target: 44×44px on any control that must work on mobile (tool buttons, Prev/Next, drawer rows, delete actions).

## Interactions & Behavior summary
- Tool selection, drag-to-draw-path, and drag-to-throw gestures: unchanged in their trigger/commit model, only the *feedback* changes (see items 3 and 7).
- File switcher popover/drawer: opens on click of the file name chip, closes on outside click / Close button / selecting a draft.
- Coach-mark (item 4): shown only when there's no saved dismissal flag for that user/browser; dismissed permanently after first successful drag on that device.
- Viewer nav footer (item 5): fixed position; narrative scrolls internally when it overflows its allotted space.
- All existing confirm-before-destroy dialogs, undo/redo stack behavior, and the breadcrumb-driven inline play picker are unchanged — this handoff only touches layout/positioning/visual feedback around them.

## Assets
No new image or icon assets. All icons in the mockups are simple inline SVG shapes (circles, lines, dashes) drawn to match the existing minimal icon style — recreate as inline SVG or your existing icon system, whichever the codebase already uses.

## Files
- `Designer Layout Options.dc.html` — the full set of mockups referenced above. Open in a browser to view all options; section/option ids referenced in this doc (1a, 1b, 2a, 3a, 4a, 4b, 5a, 5b, 6a, 6b, 7a, 7b, 8a, 8b) are anchor-linkable within that file (e.g. jump to `#8a`).
- `screenshots/` — one PNG per option, named to match its id (`1a.png`, `1b.png`, `2a.png`, `3a.png`, `4a.png`, `4b.png`, `5a.png`, `5b.png`, `6a.png`, `6b.png`, `7a.png`, `7b.png`, `8a.png`, `8b.png`), for quick reference without opening the HTML file.
