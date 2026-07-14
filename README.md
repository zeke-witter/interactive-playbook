# Mousetrap Interactive Playbook

An interactive playbook for the Mousetrap ultimate frisbee team. It replaces static PDF diagrams with animated, position-aware plays you can step through, plus a drag-and-drop editor for authoring them.

Two tools, one shared field-rendering engine:

- **Play Viewer** (`/`, `/plays/[playId]`) — pick a play, pick your position, and step through it. Each step shows animated player and disc movement plus narrative written for *your* position. Works on phone, tablet, and desktop.
- **Play Designer** (`/designer`) — a whiteboard-style field editor: place players, draw cutting paths, mark throws, add steps and branches, preview the play with real animation, then publish it into the Viewer's catalog.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · inline SVG · `ts-morph` (for the publish/narrative codegen). No database — all content lives in files on disk. No test suite (project policy — changes are verified by hand in the browser).

> **Note for contributors / AI agents:** this repo pins a Next.js version with breaking changes vs. older docs. See `AGENTS.md` and read `node_modules/next/dist/docs/` before writing framework code. Deeper architecture notes live in `CLAUDE.md` and per-directory `CLAUDE.md` files under `src/`.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the play browser. The Designer is at http://localhost:3000/designer.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (hot reload) at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint (`eslint-config-next`) |

## Authoring & publishing plays

Publishing and narrative editing **only work under `npm run dev`** — they write to the local filesystem and are disabled in production (Vercel's filesystem is read-only). The workflow:

1. Run `npm run dev` and open `/designer`.
2. Build a play (place players, draw paths, mark throws, add steps/branches). Work autosaves to `localStorage`; you can also **Save** named drafts to `designer-output/*.json`.
3. **Preview** to walk it through with animation.
4. **Publish** — writes `src/data/plays/<id>.ts` and registers it in `src/data/plays/index.ts`.
5. **Commit** the generated files to make the new/updated play part of the deployed catalog.

Per-position narrative can also be edited inline in the Viewer (dev only), which patches the play's source `.ts` file — commit the change afterward.

## Project layout

```
src/
  app/            Routes: / (browse), /plays/[playId] (viewer), /designer, + api/
  components/
    field/        Shared SVG field-rendering engine (used by viewer, designer, preview)
    sidebar/      Play Viewer UI (narrative, controls, play picker)
    designer/     Play Designer editor UI
  hooks/          useDesignerState, usePlayStep, useProgress, useRoster
  lib/            Pure helpers (tree ops, tree⇄flat conversion, field math, slugs, sound)
  data/           Play content (plays/*.ts), glossary, roster names
  types/          The two step models (play.ts = published/flat, designer.ts = authoring/nested)
docs/
  design/         Product/UX briefing + screenshots
  superpowers/    Dated spec→plan trail for every shipped feature
```

See `CLAUDE.md` at the repo root for the full architecture overview and conventions.

## Deployment

Deploys as a static-ish Next.js app on Vercel. Play content is baked in at build time from `src/data/plays/`; the dev-only write endpoints are inert in production by design.
