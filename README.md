# Mousetrap Interactive Playbook

An interactive playbook for the Mousetrap ultimate frisbee team. It replaces static PDF diagrams with animated, position-aware plays you can step through, plus a drag-and-drop editor for authoring them.

Two tools, one shared field-rendering engine:

- **Play Viewer** (`/`, `/plays/[playId]`) — pick a play, pick your position, and step through it. Each step shows animated player and disc movement plus narrative written for *your* position. Works on phone, tablet, and desktop.
- **Play Designer** (`/designer`) — a whiteboard-style field editor: place players, draw cutting paths, mark throws, add steps and branches, preview the play with real animation, then publish it into the Viewer's catalog.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · inline SVG · **Supabase** (Postgres + Auth). Content lives in the database; authoring goes through server actions that run as the signed-in user under row-level security (RLS). No test suite (project policy — changes are verified by hand in the browser).

> **Note for contributors / AI agents:** this repo pins a Next.js version with breaking changes vs. older docs. See `AGENTS.md` and read `node_modules/next/dist/docs/` before writing framework code. Deeper architecture notes live in `CLAUDE.md` and per-directory `CLAUDE.md` files under `src/`.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
# .env.local needs your Supabase project creds:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
npm run dev
```

Open http://localhost:3000 — the play browser. The Designer is at http://localhost:3000/designer. Sign in with Google to author (publish, save drafts, manage a team).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (hot reload) at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint (`eslint-config-next`) |

## Authoring & publishing plays

Authoring is **DB-backed and works in production** (dev and Vercel alike). Every write is a server action that runs as the signed-in user under Supabase RLS — no files to commit. The workflow:

1. Sign in with Google, open `/designer`.
2. Build a play (place players, draw paths, mark throws, add steps/branches). Work autosaves to `localStorage`; you can also **Save** named drafts (stored per-user in the `draft` table).
3. **Preview** to walk it through with animation.
4. **Publish** to your personal playbook, or **submit** to a team — a captain/admin then approves it into the team catalog (submit → approve). Captains can publish to their team directly.

Team captains/admin also manage members, roster names, and the team division at `/team`. To edit a play's narrative, re-publish it from the Designer.

The committed `src/data/plays/*.ts` files are only the first-run **seed** (`scripts/seedPlays.ts`); the live catalog is the database.

## Project layout

```
src/
  app/            Routes: / (browse), /plays/[playId] (viewer), /designer,
                  /my-playbook, /team, /auth + server actions (**/actions.ts)
  components/
    field/        Shared SVG field-rendering engine (used by viewer, designer, preview)
    sidebar/      Play Viewer UI (narrative, controls, play picker)
    designer/     Play Designer editor UI
  hooks/          useDesignerState, usePlayStep, useRoster
  lib/            playsRepo (DB reads) + pure helpers (tree ops, tree⇄flat, field math, slugs, sound)
    supabase/     Browser + server Supabase clients, getCurrentProfile
  data/           Seed play content (plays/*.ts) + glossary
  types/          Step models (play.ts flat, designer.ts nested) + roster.ts
supabase/
  migrations/     Database schema (SQL)
docs/
  design/         Product/UX briefing + screenshots
  superpowers/    Dated spec→plan trail for every shipped feature
```

See `CLAUDE.md` at the repo root for the full architecture overview and conventions.

## Deployment

Deploys to Vercel via its Git integration (auto-deploy on merge to `main`; PRs get a preview + CI gate). The app reads and writes **Supabase** at runtime, so production is fully interactive — authoring works there, gated by auth + RLS. Supabase env vars are configured in the Vercel project. Schema changes are SQL migrations under `supabase/migrations/`.
