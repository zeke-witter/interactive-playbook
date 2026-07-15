# Accounts & Auth — Phase 1: Data Layer (Supabase, no auth yet) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up Supabase Postgres, migrate the play catalog into it, and switch the **Viewer to read plays from the database** — with zero user-facing change and no auth yet. This de-risks the data migration before identity/roles land. See the design doc: `docs/superpowers/specs/2026-07-14-accounts-and-auth-design.md`.

**Architecture:** A new `play` table stores each play's metadata in columns and its `PlayStep[]` tree in a `jsonb` `data` column. A server-only data-access layer returns `Play`-shaped objects, so the existing rendering/types are unchanged. The two read entry points (`/` browse, `/plays/[playId]`) source from the DB instead of the static `ALL_PLAYS`/`PLAYS` import. The committed `src/data/plays/*.ts` files remain as the **seed source**. Publishing/Designer stay file-based/dev-only in this phase (re-run the seed to sync); they move to the DB in Phase 3.

**Tech stack additions:** `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI (dev dependency for migrations). These are legitimate runtime deps (unlike throwaway tooling) and belong in `package.json`.

## Global Constraints

- **Free tier only.** Requires a **separate** Supabase project (Auth is per-project; do not reuse the nonprofit's project). Confirm a free project slot exists before starting.
- **No secrets in git.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go in `.env.local` (already covered by `.env*` in `.gitignore`); the **`SUPABASE_SERVICE_ROLE_KEY` is server/seed-only and must never be `NEXT_PUBLIC_` or reach the browser.**
- **No automated tests** (project policy). Verify with `npx tsc --noEmit`, a production build, and manual browser checks.
- **Do not delete** `src/data/plays/*.ts` or `src/data/plays/index.ts` — they are the seed source this phase depends on.
- **Do not touch** `components/field/*`, `components/sidebar/*` rendering internals, `types/play.ts`, `types/designer.ts`, or the designer — only the read path changes.

---

### Task 1: Supabase project, env, dependencies

- [x] **Step 1: Create the project (manual, out-of-band).** In the Supabase dashboard, create a new **free** project (separate from the nonprofit's). Note the Project URL, `anon` public key, and `service_role` key. — DONE: project ref `htoqmozptttecxtygssn`; uses new-style keys (publishable/secret) rather than legacy anon/service_role.
- [x] **Step 2: `.env.local`** (create if absent; it is gitignored): — DONE.
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server/seed only — never NEXT_PUBLIC
```
- [x] **Step 3: Dependencies.** — DONE (installed).
```bash
npm i @supabase/supabase-js @supabase/ssr
npm i -D supabase tsx
```
- [ ] **Step 4: Commit** (package files only; `.env.local` stays untracked). — PENDING user go-ahead to commit.
```bash
git add package.json package-lock.json && git commit -m "chore: add supabase client + cli deps"
```

---

### Task 2: Schema + RLS migration

**Files:** create `supabase/migrations/0001_init.sql`

- [x] **Step 1: Write the migration** (types, tables, RLS). — DONE: `supabase/migrations/0001_init.sql` (added `unique (team.name)` for idempotent seed).
```sql
-- (team, membership, play, progress, draft tables + enums exactly as in the design doc)

alter table team enable row level security;
alter table membership enable row level security;
alter table play enable row level security;
alter table progress enable row level security;
alter table draft enable row level security;

-- Phase 1 (no auth): published plays are publicly readable to match today's
-- public site. This policy is REPLACED by membership-scoped policies in Phase 3.
create policy "phase1 public read published plays"
  on play for select
  to anon, authenticated
  using (status = 'published');

-- No insert/update/delete policies yet: writes happen only via the seed script,
-- which uses the service_role key and bypasses RLS. team/membership/progress get
-- their read/write policies in later phases.
```
- [x] **Step 2: Apply** it to the project. — DONE (applied via Supabase MCP `apply_migration` as migration `0001_init`; all 5 tables + RLS confirmed present). **Follow-up:** tables created by the MCP migration tool did **not** inherit Supabase's default DML grants — the api roles only had `REFERENCES/TRIGGER/TRUNCATE`, so the seed failed with `42501 permission denied`. Added `supabase/migrations/0002_grants.sql` (applied as `0002_grants`): `service_role` gets full DML (seed/server writes bypass RLS); `anon`+`authenticated` get `SELECT` on `play` only (Viewer read path; RLS still gates rows). Other tables stay grant-less until their phases.
- [ ] **Step 3: Commit** the migration files (`0001_init.sql` + `0002_grants.sql`). — PENDING user go-ahead.

---

### Task 3: Server Supabase client + data-access layer

**Files:** create `src/lib/supabase/server.ts`, `src/lib/playsRepo.ts`

- [x] **Step 1: Server client** (`src/lib/supabase/server.ts`) — DONE (async `cookies()` per Next 16; `getAll`/`setAll` per @supabase/ssr). — an anon-key client for RLS-enforced **server-side** reads, built with `@supabase/ssr`'s `createServerClient` (cookie wiring per the current `@supabase/ssr` App Router docs — read the installed package's docs before writing). This file is server-only; never import it into a `'use client'` module.
- [x] **Step 2: Repository** (`src/lib/playsRepo.ts`) — DONE (grouping helpers take a `Play[]` arg). — maps rows → the existing `Play` type so nothing downstream changes:
```ts
import type { Play } from '@/types/play'
import { getServerSupabase } from './supabase/server'

function rowToPlay(row: {
  slug: string; name: string; category: string; set: string; description: string; data: unknown
}): Play {
  return {
    id: row.slug,
    name: row.name,
    category: row.category as Play['category'],
    set: row.set as Play['set'],
    description: row.description,
    steps: row.data as Play['steps'],
  }
}

export async function getPublishedPlays(): Promise<Play[]> {
  const sb = getServerSupabase()
  const { data, error } = await sb.from('play')
    .select('slug,name,category,set,description,data')
    .eq('status', 'published')
    .order('name')
  if (error) throw error
  return (data ?? []).map(rowToPlay)
}

export async function getPlayBySlug(slug: string): Promise<Play | null> {
  const sb = getServerSupabase()
  const { data, error } = await sb.from('play')
    .select('slug,name,category,set,description,data')
    .eq('status', 'published').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? rowToPlay(data) : null
}
```
Also provide `categoriesWithPlays` / `setsInCategory` / `playsInSet` equivalents that operate on a passed-in `Play[]` (so the picker can be fed server-fetched data) — or reuse the pure helpers from `data/plays/index.ts` by passing the fetched array. Keep the pure grouping logic; only the *source* changes.
- [x] **Step 3: Typecheck.** `npx tsc --noEmit`. — DONE (exit 0).
- [ ] **Step 4: Commit.** — PENDING user go-ahead.

---

### Task 4: Seed script

**Files:** create `scripts/seedPlays.ts`

- [x] **Step 1: Write the seed** — DONE: `scripts/seedPlays.ts` (env guard added; secret key; idempotent team + play upserts). — uses the **service_role** key (bypasses RLS) to create the "Mousetrap" team (idempotent) and upsert every play from the existing static catalog:
```ts
import { createClient } from '@supabase/supabase-js'
import { ALL_PLAYS } from '../src/data/plays'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: team } = await sb.from('team').upsert({ name: 'Mousetrap' }, { onConflict: 'name' }).select().single()
  // NOTE: add a unique constraint on team.name (or look up existing) so this is idempotent.
  for (const p of ALL_PLAYS) {
    await sb.from('play').upsert({
      team_id: team!.id, slug: p.id, name: p.name, category: p.category,
      set: p.set, description: p.description, status: 'published', data: p.steps,
    }, { onConflict: 'team_id,slug' })
  }
  console.log(`seeded ${ALL_PLAYS.length} plays`)
}
main().catch((e) => { console.error(e); process.exit(1) })
```
- [x] **Step 2: Run** it: `npm run seed`. — DONE: seeded 7 plays into team "Mousetrap" (`f24352de-2271-47e7-82e7-f791a7cf2a30`); row count and per-play `jsonb` step counts match `ALL_PLAYS`.
- [x] **Step 3: Add an npm script** `"seed": "tsx --env-file=.env.local scripts/seedPlays.ts"` — DONE (added to package.json). Commit pending. (Re-run `npm run seed` after any local publish until Phase 3.)

---

### Task 5: Switch the Viewer read path to the DB

**Files:** modify `src/app/plays/[playId]/page.tsx`, `src/app/page.tsx`, `src/components/sidebar/PlayPicker.tsx`

- [x] **Step 1: Play viewer page.** — DONE. `src/app/plays/[playId]/page.tsx` is now an async **server component**: `await params`, fetches `getPlayBySlug(playId)` + `getPublishedPlays()` in parallel, `notFound()` when null, renders `<PlayViewer play={play} plays={plays} />`. The old `'use client'` body moved verbatim (plus a `plays` prop for the picker) into new `src/app/plays/[playId]/PlayViewer.tsx`; all hooks unchanged.
- [x] **Step 2: Home/browse page.** — DONE. `src/app/page.tsx` is now `async`, does `const plays = await getPublishedPlays()`, and passes `<PlayPicker plays={plays} />`.
- [x] **Step 3: PlayPicker.** — DONE. `PlayPicker` takes `plays: Play[]` and computes category/set groupings **inline** (not via the `playsRepo` helpers: importing them into this `'use client'` module would pull the server-only Supabase client into the client bundle). Breadcrumb UI + `useRouter` navigation unchanged. `Sidebar` gained a `plays` prop threaded to both `PlayPicker` and `PickerDrawer`; `PickerDrawer` passes it through.
- [x] **Step 4: Leave the static catalog in place.** — DONE (untouched; still the seed source).
- [x] **Step 5: Typecheck.** `npx tsc --noEmit` — exit 0.
- [ ] **Step 6: Commit.** — PENDING user go-ahead.

---

### Task 6: Build + manual verification

- [x] **Step 1: Production build.** `npm run build` — DONE, succeeded. `/` and `/plays/[playId]` are now `ƒ` (dynamic, server-rendered on demand) as expected (the server Supabase client reads `cookies()`).
- [x] **Step 2: Manual check** (against running `npm run dev`):
  - Home page returns 200 and renders the category/set browse UI sourced from `getPublishedPlays()`.
  - `/plays/flood` returns 200 and renders. DB-source proof: renamed `flood` to `Flood (DB-EDIT-PROBE)` in the DB → probe appeared in the page HTML with no code change → reverted to `Flood` and confirmed the page reverted.
  - `/plays/does-not-exist` returns 404.
- [ ] **Step 3: Commit** any fixups. — PENDING user go-ahead.

---

## Self-Review Notes

- The `Play` type is unchanged; `rowToPlay` maps `slug→id` and `data→steps`, so routes and rendering are untouched.
- `service_role` is confined to the seed script; the app reads with the anon key under RLS; no secret is `NEXT_PUBLIC_` except URL + anon key (both safe client-side).
- The temporary public-read policy matches today's fully public site and is explicitly slated for replacement in Phase 3 (membership-scoped).
- Static catalog retained as seed source — reversible, nothing lost. Rollback is "point the pages back at the static import."
- Prerequisite gate: a free Supabase project slot must exist (design doc open question).
