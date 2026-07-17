# src/app/ — Routes (Next.js App Router)

> Reminder: this is Next.js 16 with breaking changes vs. older docs (see root `AGENTS.md`). `params` is a `Promise` and is unwrapped with `use(params)` / `await params`.

## Pages
- **`page.tsx`** — `/`, the home/browse screen. Server component: an ambient decorative field (`AmbientField`) beside the `PlayPicker`. The main entry into the Viewer.
- **`plays/[playId]/page.tsx`** — `/plays/[playId]`, the **Play Viewer**. Server component: fetches the play + published-play list + team roster pool via `src/lib/playsRepo.ts` (`getPlayBySlug` / `getPublishedPlays` / `getRosterPoolForPlay`), `notFound()`s if missing, and renders the `'use client'` `PlayViewer`. `PlayViewer` holds `selectedPosition` state and wires `usePlayStep` (step nav) + `useRoster(pool)` into the shared `FieldCanvas` and the `Sidebar`. Branch choices call `goToStep(branch.nextStepId)`; a per-step/position quiz gates Next via `quizPassed`. (`/my-playbook/[slug]` reuses `PlayViewer` for owner-only personal plays.)
- **`designer/page.tsx`** — `/designer`, the **Play Designer**. `'use client'`. Calls `useDesignerState()` once and composes the whole editor shell. Renders **two full layouts** (mobile: top bar + `MobileToolTabBar` + `MobileStepSheet`; desktop: `DesignerTopBar` + `ToolRail` + `DesignerCanvas` + `DesignerSidePanel`), a full-screen `DesignerPreview` when previewing, and a first-run `CoachMark`. Owns the Ctrl/Cmd+Z(+Shift) keyboard shortcuts and all the file-management callbacks (`handleSave`/`handlePublish`/`handleLoadDraft`/…) that call the Designer **server actions** (`app/designer/actions.ts`).
- **`layout.tsx`** — root layout; loads fonts (Oswald display, Geist body) and sets metadata. **`globals.css`** — Tailwind v4 import + the `@theme` design tokens (the single source of the color/type system).

## Routes & server actions
Beyond the pages above: `/my-playbook` (personal plays), `/team` (captain/admin management), and `/auth/callback` (OAuth). All authoring/management **writes are server actions** — `app/designer/actions.ts` (publish, submit, drafts, formations), `app/team/actions.ts` (members, roster names, division, approve/deny), `app/auth/actions.ts` (sign-out) — each running as the signed-in user under Supabase RLS. Server-side reads go through `src/lib/playsRepo.ts`.

## `api/` — retired (see `api/CLAUDE.md`)
The old dev-only, filesystem-mutating `ts-morph` route handlers were removed in the accounts/auth work and replaced by the server actions above. The directory keeps only its CLAUDE.md as a gravestone; don't reintroduce API routes for authoring.

## Patterns
- Both viewer pages share the same responsive shell: a `5/6`-aspect field pane (`md:w-[65%]`) beside a sidebar (`md:w-[35%]`), stacking vertically on mobile.
- Field rendering is never duplicated here — pages compose `components/field/` (viewer & designer) and delegate all play logic to hooks.
- Route entry pages (`/`, `/plays/[playId]`, `/my-playbook`, `/team`) are **server components** that fetch data (via `playsRepo` / Supabase) and pass it into `'use client'` shells (`PlayViewer`, the Designer). Anything interactive/stateful is a client component.
