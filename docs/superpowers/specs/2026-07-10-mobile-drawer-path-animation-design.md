# Mobile Drawer, Path-Following Animation, Endzone Visibility, Flood Fix — Design

## Problem

Four independent issues from user feedback after reviewing the mobile layout:
1. Prev/Next controls sit at the bottom of the whole sidebar instead of directly under the field.
2. The play picker takes up permanent space in the mobile sidebar instead of living in an on-demand drawer.
3. Token movement animates as a direct point-to-point tween, ignoring the dashed path preview's actual route.
4. The field always shows a shaded "attacking endzone" band at the top, even for plays that realistically take place near midfield, 50 yards from that endzone.

A fifth item is a data correction: Flood's C4 should clear with C2/C3, then cut back under as C1's continuation target — not sit static the whole play.

## Goal & Non-Goals

Fix all four/five items. Mobile-only for the layout changes (items 1-2) — desktop keeps its current always-visible sidebar picker and bottom-of-sidebar controls, confirmed with the user. No changes to any other play's data, no changes to the entrance pop-in animation's mechanics.

## 1. Controls Under the Field (Mobile Only)

Extract the existing `step.branches?.length ? <BranchChoice/> : <StepControls/>` block out of `Sidebar` into a new small component, `PlayControls`, taking the same props that block already uses. Render it **twice** in the tree — once positioned right after the field (visible only below the `md` breakpoint via `md:hidden`), once inside `Sidebar` in its current position (visible only at `md` and up via `hidden md:flex`). This is a standard "same content, different position per breakpoint" pattern: `display:none` fully removes the hidden copy from layout and hit-testing, so only one copy is ever interactive at a time.

## 2. Picker Drawer (Mobile Only)

- A floating hamburger button (`☰`), fixed to the top-right corner of the field frame, visible only below `md` (`md:hidden`).
- Tapping it opens a right-side slide-in drawer (dark surface, matching the existing token system) containing the same `PlayPicker` component already used on desktop — reused as-is, just mounted in a different container. A semi-transparent backdrop behind the drawer closes it on tap.
- Desktop is unaffected: `PlayPicker` keeps rendering inline in `Sidebar` exactly as it does today, and the drawer/hamburger markup doesn't render at all above `md` (`md:hidden` on the whole drawer+button assembly).
- Drawer open/close state lives in the play page (`useState`), passed to a new `PickerDrawer` component wrapping the hamburger button + backdrop + slide-in panel.

## 3. Path-Following Animation

`PlayerTokens` already computes `dimmed`/`label` per player each render; it gains one more per-player lookup: the current step's `pathPreviews` entry matching `path.playerId === player.id` (offense only — defense never has a path preview in the data model). If found, it converts that path's `points` through `toPixel` and passes the resulting pixel-coordinate array to `PlayerToken` as a new `pathPoints?: { px: number; py: number }[]` prop. If not found, `pathPoints` is `undefined`.

Inside `PlayerToken`, the `animate.x`/`animate.y` values become the mapped `pathPoints` arrays when present (Framer Motion treats an array as sequential keyframes, distributing them evenly across the transition's duration) — otherwise they fall back to the single `px`/`py` target exactly as today. This only applies when `entering` is `false` (i.e., not during the initial mount's pop-in, which must keep its existing "no travel" behavior) — gated with a ternary on the existing `entering` state.

Since a path's last point always matches the player's actual settled position for that step (already true of every path in the current play data), the token still ends up in the correct final spot — it just gets there by tracing the visible dashed line instead of a straight interpolation.

## 4. Conditional Attacking-Endzone Band

`FieldBackground` gains a `showAttackingEndzone: boolean` prop. When `false` (the new default for anything that isn't an endzone-set play), it skips drawing the top endzone rect and its divider line entirely — the main field's green fill extends to the top of the viewBox instead. The bottom (own) endzone band is unaffected and always renders; only the top band is conditional.

`FieldCanvas` computes this from a new `playSet: Play['set']` prop (`showAttackingEndzone={playSet === 'endzone'}`), threaded from the play page, which already has `play.set` available.

This also improves several existing plays' deep cuts (e.g. Reverse's isolation shot, Windmill's deep cuts) — those positions sit within the old endzone band's y-range but represent players deep in *open field*, not literally standing in the opponent's endzone; removing the band for non-endzone plays resolves that visual mismatch as a side effect.

## 5. Flood Data Correction

C4 currently holds a static position the entire play. Per the source material's actual roles, C4 should clear with C2/C3 (step 2), then cut back under toward the middle/open side — becoming C1's downfield continuation option (previously modeled as "stay put and receive a pass" rather than an active cut). Steps 2 and 4 get new `pathPreviews` entries for C4 (which will now visibly trace their route per the Path-Following Animation feature above), and narrative text is updated across all 5 steps to describe C4's active role instead of "isolated deep, holds."

## Verification

No automated tests (project-wide policy). Verify manually: resize to a mobile viewport and confirm Prev/Next sit under the field, the hamburger opens/closes the picker drawer, and desktop (resize back up) is unchanged. Step through Flood and confirm C1's step-3 curl and C4's step-2/4 cuts visibly trace their dashed paths rather than a straight line. Load a non-endzone play (e.g. Flood) and confirm no shaded band at the top of the field; load an endzone play (e.g. Endzone — Baby ISO) and confirm the band still renders there.
