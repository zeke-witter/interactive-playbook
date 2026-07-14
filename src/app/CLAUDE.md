# src/app/ — Routes (Next.js App Router)

> Reminder: this is Next.js 16 with breaking changes vs. older docs (see root `AGENTS.md`). `params` is a `Promise` and is unwrapped with `use(params)` / `await params`.

## Pages
- **`page.tsx`** — `/`, the home/browse screen. Server component: an ambient decorative field (`AmbientField`) beside the `PlayPicker`. The main entry into the Viewer.
- **`plays/[playId]/page.tsx`** — `/plays/[playId]`, the **Play Viewer**. `'use client'`. Looks the play up in `PLAYS` (404s if missing), holds `selectedPosition` state, and wires `usePlayStep` (step nav) + `useProgress` + `useRoster` into the shared `FieldCanvas` and the `Sidebar`. Branch choices call `goToStep(branch.nextStepId)`; a per-step/position quiz gates Next via `quizPassed`.
- **`designer/page.tsx`** — `/designer`, the **Play Designer**. `'use client'`. Calls `useDesignerState()` once and composes the whole editor shell. Renders **two full layouts** (mobile: top bar + `MobileToolTabBar` + `MobileStepSheet`; desktop: `DesignerTopBar` + `ToolRail` + `DesignerCanvas` + `DesignerSidePanel`), a full-screen `DesignerPreview` when previewing, and a first-run `CoachMark`. Owns the Ctrl/Cmd+Z(+Shift) keyboard shortcuts and all the file-management callbacks (`handleSave`/`handlePublish`/`handleLoadDraft`/…) that talk to the API routes.
- **`layout.tsx`** — root layout; loads fonts (Oswald display, Geist body) and sets metadata. **`globals.css`** — Tailwind v4 import + the `@theme` design tokens (the single source of the color/type system).

## `api/` — see `api/CLAUDE.md`
Dev-only endpoints that mutate the local filesystem (publish plays, save/load drafts, edit narrative). Inert in production.

## Patterns
- Both viewer pages share the same responsive shell: a `5/6`-aspect field pane (`md:w-[65%]`) beside a sidebar (`md:w-[35%]`), stacking vertically on mobile.
- Field rendering is never duplicated here — pages compose `components/field/` (viewer & designer) and delegate all play logic to hooks.
- Interactive pages are `'use client'`; the home page stays a server component.
