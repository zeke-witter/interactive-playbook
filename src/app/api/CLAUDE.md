# src/app/api/ — (retired)

This directory previously held **dev-only, filesystem-mutating** route handlers (`designer/publish`, `designer/save`, `designer/drafts[/name]`, `plays/[playId]/narrative`) that wrote play/draft/narrative content to disk via `ts-morph`. They only worked under `npm run dev` (Vercel's FS is read-only) and required a commit + deploy to publish.

**As of Phase 4 (accounts & auth), authoring is DB-backed and works in production.** Those routes were removed and replaced by role-gated **server actions** that write to Supabase under RLS:

- **Play publish / delete / hide / import** — `src/app/designer/actions.ts` (`publishPersonalPlay`, `publishTeamPlay`, `deletePersonalPlay`, `importTeamPlayToPersonal`, and the named-draft CRUD `listDrafts`/`saveDraft`/`loadDraft`/`deleteDraft`). Drafts now live in the `draft` table (per user), not `designer-output/*.json`.
- **Member/team management** — `src/app/team/actions.ts`.
- **Narrative** is edited by re-publishing from the Designer (the former inline dev-only editor was removed). A dedicated in-place narrative action is a future addition.

The committed `src/data/plays/*.ts` catalog is now purely the first-run **seed** (see `scripts/seedPlays.ts`), no longer a live write target.

If you add a new server-side mutation, prefer a **server action** that runs as the signed-in user under RLS (re-check role in code for defense in depth) — do **not** reintroduce a `service_role` client in app code.
