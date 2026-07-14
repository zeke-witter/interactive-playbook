# src/components/ — UI components

Three subdirectories, each with its own `CLAUDE.md`:

- **`field/`** — the shared SVG field-rendering engine (`viewBox="0 0 100 120"`, normalized 0–1 coords via `toPixel`). Used by the Viewer, the Designer canvas, and the Designer preview. This is the one piece of rendering both tools share.
- **`sidebar/`** — the **Play Viewer**'s right-hand UI: narrative, glossary tooltips, step/branch controls, position selector, and the play picker. Largely presentational; play-progression state lives in the page + `usePlayStep`.
- **`designer/`** — the **Play Designer** editor UI: interactive canvas, tool rails, step tree, branch forms, file switcher, preview, coach mark. Driven by the single `useDesignerState` store.

## Shared conventions
- **Design tokens, not hex.** Use Tailwind semantic classes from `globals.css` `@theme` (`bg-surface`, `text-text-muted`, `border-accent`, `text-accent`, `success-*`, `danger-*`). The deliberate exception is SVG field colors (blue own-side `#2563eb`, red opposing `#dc2626`, path colors) which are constants in `lib/`.
- **`'use client'`** on anything interactive, stateful, or animated; pure presentational SVG omits it.
- **Position tokens → roster names** at render via `substituteNames` (`lib/names`). Never store names in content.
- **Selection = rings, not repaint.** Active tokens get a colored ring around them; the token fill signals side (own/opposing), not selection.
- **Framer Motion** (`motion.g`/`motion.circle`) does all animation; keep token React keys stable across steps so they tween instead of remounting.
