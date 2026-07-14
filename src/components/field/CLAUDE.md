# src/components/field/ — Shared SVG field engine

The rendering core shared by the Viewer, the Designer canvas, and the Designer preview. Everything draws into one SVG coordinate space: `viewBox="0 0 100 120"` (`FIELD_WIDTH=100`, `FIELD_HEIGHT=120` from `lib/field`). Play data stores **normalized 0–1** positions; convert with `toPixel(x, y)` — don't hardcode multipliers. The field always defends **upward** (y=0 attacking endzone at top).

## Files
- **`FieldCanvas.tsx`** — top-level composer for one `PlayStep`. Renders `FieldBackground` → `PathPreviews` → `PlayerTokens` → `Disc`, plus an optional `highlightZone` rect (driven by glossary hover). Props: `step`, `selectedPosition`, `playCategory`, `playSet`, `roster`, `highlightZone?`, `onSelectPosition?`, `onThrowComplete?`. Sets `showEndzone` from `playSet === 'endzone'`. This is what the Viewer page mounts.
- **`FieldBackground.tsx`** — static pitch (grass, boundary, optional endzone band + label). Pure SVG, no client directive. Reused by `AmbientField` and `DesignerPreview` too.
- **`PathPreviews.tsx`** — dashed route polylines from `PlayerPath[]`, colored by `PATH_COLOR[type]`. **Filters out defensive paths** (authoring-only). Pure/static.
- **`PlayerTokens.tsx`** — maps `PlayerState[]` → `PlayerToken`s. Computes per player: `dimmed` (opposite side from `playCategory`), the display `label` (roster name if active, generic `D#`/id if dimmed), the matching movement path, and `isYou` (`!dimmed && id === selectedPosition`). Wires `onClick` → `onSelectPosition` for active players only.
- **`PlayerToken.tsx`** — one animated token (`'use client'`). Blue `#2563eb` own-side / red `#dc2626` opposing; white ring when `isYou`. Framer Motion entrance "pop" (overshoot scale, staggered by `enterIndex`), then follows `pathPoints` keyframes if it has a path; dims to 0.4 opacity when `dimmed`. Fires `playBubblePop` synced to the entrance peak.
- **`Disc.tsx`** — the disc (`'use client'`). Rests up-and-right of the offensive holder, or animates along the `throw` arc from thrower to receiver (`0.7s`), firing `onThrowComplete`. Keyed by `step.id` so a new step re-triggers.
- **`AmbientField.tsx`** — decorative-only (`'use client'`). 14 tokens wandering perpetually via Framer Motion; SSR-safe (fixed initial positions, randomize after mount). Consumes **no** play data — used as background chrome on the home page. Don't wire real play logic into it.

## Patterns
- Token visual constants (radius ~3.2, colors, label sizing) are consistent between `PlayerToken` and the ambient tokens.
- Animation is expressed as **arrays of pixel keyframes** on `x`/`y` for multi-point routes; completion callbacks drive state transitions (entering → moving) and step progression.
- The **only** place play state lives is props — these components are pure renderers of a `PlayStep` (except `AmbientField`). The Designer reimplements interaction in its own `DesignerCanvas`/`DraggableToken` rather than making these editable.
