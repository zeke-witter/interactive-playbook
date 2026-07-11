# Play Designer — Mark Throw Redesign — Design

> Built as part of an overnight autonomous batch. Per standing instruction, this spec is not gated on a synchronous approval round-trip — the user's request message specified this interaction in enough procedural detail (click sequence, highlight rules, chip behavior) that no clarifying questions were needed before proceeding; every decision below either restates that detail directly or is a small, clearly-scoped implementation choice noted inline.

## Problem

"Mark Throw" mode currently requires two separate clicks (select the disc holder, then click the intended receiver) with no visual feedback distinguishing "nothing selected yet" from "holder selected, waiting for a target" from "throw marked" — the user reported it "doesn't seem to do anything" when clicking a receiver, and there's no indication in the UI of what state the tool is in.

## Redesigned Interaction (as specified by the user)

1. Click "Mark Throw" → the current disc holder's token is highlighted (a distinct ring color, always visible while in this mode, independent of any click).
2. A small instructional pill is shown on the canvas: "Click and drag disc to the receiver."
3. Press-and-drag starting from within the highlighted holder's token border. The holder's own position never moves (unlike Position mode's drag) — a small ghost disc circle follows the cursor instead.
4. While dragging, whichever offensive player's token the cursor is currently over gets a hover highlight (a different ring color than the holder's) — the holder itself is never a valid hover target. Releasing the pointer over a highlighted player commits them as this step's throw receiver (`setThrow`); releasing anywhere else (empty field, back on the holder) cancels the gesture with no change.
5. Once committed, the receiver's ring changes to a third, distinct color signaling "this role has been set" (independent of hover/drag state — it stays that color afterward, including on a later plain click).
6. A plain click (no drag) on any offensive player while still in Mark Throw mode selects them for chip display purposes, without touching their ring color or the current throw:
   - If the clicked player is the current disc holder: a "Has disc" chip appears under the mode buttons. Its × (remove) control is shown **only when the currently-viewed step is the play's very first step** (`currentPath` is exactly the root's step 0) — every other step's holder comes from an automatic transfer off the previous step's throw, so there's nothing meaningful to "remove" there without going back and changing that throw instead.
   - If the clicked player is the current step's throw target: a "Receiving disc" chip appears, always removable — its × clears this step's throw entirely (`throw` becomes `undefined`), letting the user drag a new one.
   - Clicking anyone else: no chip (their ring still gets a plain white "you clicked this" highlight, matching the same convention Position mode already uses for selection — harmless, no functional effect).

## Design Decisions Not Explicitly Spelled Out in the Request

- **Ring colors:** holder = the app's existing accent lime (`#a3e635`, already the "primary action" color throughout the designer); live hover-during-drag = white (matches the existing "selected" ring convention already used everywhere else); committed receiver = the app's existing success green (`#4ade80`, already defined in `globals.css` for other "confirmed/good" states). No new colors introduced.
- **Hit-test method:** pointer capture (already used for every draggable token in this app) means the browser keeps routing pointer events to the element the drag started on, not whatever's visually under the cursor — so "highlight whoever the cursor is over" can't rely on hover/enter DOM events during the drag. It's computed geometrically instead: on every drag move, convert the cursor to field-pixel coordinates (the same conversion every other canvas interaction already uses) and find the nearest offensive player within a small radius (4.5 field units — slightly larger than a token's own visual radius of 3.2, so the hit zone is a little forgiving). This is a pure extension of a technique already used throughout the designer, not a new dependency.
- **Instructional pill placement:** rendered as an absolutely-positioned overlay on top of the canvas (the canvas's existing parent wrapper is already `position: relative`, so no structural change is needed to place it), shown for the whole duration of Mark Throw mode — not just before the first drag — since re-dragging to change the receiver is equally valid at any time in that mode.
- **"Has disc" removal is UI-gated, not hook-gated:** the underlying hook function that clears a step's disc-holder flag is unconditional; the toolbar simply only renders its × button when the step-1 condition holds. This matches the existing pattern elsewhere in the designer (e.g. destructive-delete confirmations are UI-level, not baked into the hook functions themselves).
- **No change to Position mode's existing "Set as Disc Holder" button.** That's how a step first gets a disc holder assigned (most relevantly step 1, since every later step's holder is normally auto-transferred). The new "Has disc"/"Receiving disc" chips are an entirely separate, additional piece of UI scoped to Mark Throw mode — they don't replace or duplicate that existing mechanism.

## Non-Goals

- No change to how `ThrowArc` (`{ from, to }`) is stored — this is purely an interaction/UI redesign of how it gets authored, not a data-model change.
- No retroactive re-linking: clearing a step's throw after a later step has already been created via "+ Add Step" (which bakes in the disc transfer at creation time) does not retroactively change that already-created later step. This matches the existing, already-shipped one-shot-transform-at-creation-time behavior from a prior round, not something this feature needs to alter.
- No handling for "no disc holder assigned yet" beyond graceful no-ops (holderIndex resolves to -1, nothing is draggable, the pill's instruction just doesn't have anything to act on yet) — this mirrors the previous click-click flow's existing behavior in that same situation.

## Verification

No automated tests (project policy). Manual verification: enter Mark Throw mode on a step with a disc holder already set, confirm the holder shows the accent ring and the instructional pill appears; press-drag from the holder toward another offensive player, confirm that player highlights white as the cursor crosses into their token and the ghost disc follows the cursor; release over them, confirm their ring turns green and `setThrow` was actually called (check by switching to Position mode's disc-holder indicator on the next step, or by inspecting the exported JSON); release over empty space instead and confirm nothing changed; click the green receiver afterward and confirm a "Receiving disc" chip with a working × appears under the mode buttons; click the holder and confirm a "Has disc" chip appears, with its × present only on step 1 and absent on any other step.
