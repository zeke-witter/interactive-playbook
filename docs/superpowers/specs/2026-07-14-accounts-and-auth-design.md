# Accounts, Teams, Roles & Production Authoring — Design

## Problem

Today the app has no backend and no database. Plays are TypeScript files committed to the repo (`src/data/plays/*.ts`), publishing only works in local dev (writes `.ts` via `ts-morph`) and requires a git commit + deploy, viewer progress lives in `localStorage`, and rosters are random per load. This blocks the three things we now want:

1. **Authoring in production** — coaches/captains create and publish plays from the live site, no local dev + git.
2. **Team playbooks & sharing** — a team owns a playbook; members join and see their team's plays.
3. **Roles & permissions** — coaches edit/publish; players view (and track their own progress).

All three require plays to leave the repo and live in a database, with mutations gated server-side by identity + role.

## Goal & Non-Goals

Move the app onto a real data layer with authentication, team-scoped data, and role-gated authoring — **single-team now (Mousetrap), architected multi-tenant so new teams can be turned on later with minimal change.**

**Non-goals (this round):**
- No public multi-team signup UX yet (the *schema* is multi-tenant, but the "any coach can create a team" flow is a later phase).
- No billing/plans, no payments — the entire design must run on **free tiers only** (hard constraint).
- No change to the field-rendering engine, the `Play`/`DesignerStep` types, or the step/branch model — only where plays are **stored** and **who may mutate them**.
- No realtime multi-user co-editing.

## Chosen stack (and why)

**Supabase (Auth + Postgres + Row-Level Security), `@supabase/ssr`, `supabase-js`, SQL migrations via the Supabase CLI.**

- The user already runs Supabase for another project and is familiar with it; **free tier covers Postgres + Auth (Google OAuth) + RLS** — no per-MAU auth pricing. (Sign-in is Google-only for now; email magic link can be added later.)
- **RLS enforces tenant isolation and role rules in the database**, so a bug in app code can't leak another team's plays — a strong property for a multi-tenant trajectory.
- Rejected alternatives: **Clerk** (turnkey Organizations, but custom roles / higher org tiers can hit a paywall — violates the no-money constraint) and **Auth.js + Postgres** (free, but you rebuild orgs/invites/roles by hand). Neon's serverless niceties are irrelevant at team scale.

**Free-tier caveats to design around:** a separate Supabase **project** is required (Auth is per-project; don't share the nonprofit's project — that would merge user pools). Free plan allows a limited number of active projects (≈2; verify) and **pauses a project after ~7 days of inactivity** (auto-resumes with a brief cold start). Acceptable for a team study tool.

## Data model (single-team now, multi-tenant-ready)

Everything that is team-owned carries `team_id`. RLS keys on the caller's memberships.

```sql
create type member_role as enum ('coach', 'player');
create type play_status as enum ('published', 'archived');  -- drafts live in their own table, not here

create table team (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table membership (
  team_id     uuid not null references team(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'player',
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table play (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references team(id) on delete cascade,
  slug         text not null,                 -- human id within a team (unique per team)
  name         text not null,
  category     text not null,                 -- 'offense' | 'defense'
  set          text not null,                 -- 'ho-stack' | 'vert-stack' | 'flow' | 'zone' | 'endzone'
  description  text not null default '',
  status       play_status not null default 'published',
  data         jsonb not null,                -- the DesignerStep[] / Play step tree, verbatim
  created_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now(),
  unique (team_id, slug)
);

create table draft (               -- Designer autosaves / named work-in-progress, per user
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references team(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category     text not null,
  set          text not null,
  description  text not null default '',
  data         jsonb not null,                -- nested DesignerStep[] authoring tree
  updated_at   timestamptz not null default now(),
  unique (team_id, user_id, name)
);

create table progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  play_id      uuid not null references play(id) on delete cascade,
  position     text not null,                 -- 'H1'..'C4'
  completed_at timestamptz not null default now(),
  primary key (user_id, play_id, position)
);
```

**Key decision — plays are a single `jsonb` column, not normalized tables.** The step/branch tree is already treated as opaque JSON everywhere (drafts are JSON files today; `Play`/`DesignerStep` serialize cleanly). So the whole authoring model drops into `play.data` unchanged; no schema churn when the step model evolves. Note the two shapes: **`play.data` holds the flat published `PlayStep[]`; `draft.data` holds the nested `DesignerStep[]` authoring tree** (matching today's `designer-output/*.json`) — the app's existing two-model split, preserved.

**Roles:** `coach` = create/edit/publish/delete plays, invite/manage members; `player` = view + own progress. (`captain` can be added to the enum later.)

## Authorization (RLS sketch)

A helper predicate — "is the caller a member of this team" / "…a coach of this team" — drives policies:

```sql
-- read: any member of the team can read that team's plays;
-- (Phase 1 temporary: published plays are also world-readable to match today's public site)
-- write: only coaches of the team can insert/update/delete plays.
```

Reads run through the **anon/user client** (RLS-enforced) from server components; writes run in **server actions** that also re-check role in code (defense in depth). The `service_role` key is used **only** by the offline seed script and never reaches the browser.

## Impact on existing code

- **Publish** (`/api/designer/publish`, ts-morph → `.ts`) becomes a **coach-gated server action** upserting a `play` row. This removes the dev-only limitation — authoring works in production.
- **Drafts** (`designer-output/*.json`) become rows in a per-user **`draft`** table (nested `DesignerStep[]`) — Phase 3.
- **Viewer reads** (`ALL_PLAYS` / `PLAYS` static import) become team-scoped DB queries in server components.
- **Seed:** a one-time script reads today's `ALL_PLAYS` → inserts them as the Mousetrap team's published plays. The committed `.ts` files stay as the seed source; nothing is lost.
- **Progress** moves from `localStorage` to the `progress` table (later phase).
- **Untouched:** `components/field/*`, `components/sidebar/*` rendering, `types/play.ts`, `types/designer.ts`, `lib/designerSteps.ts`, `lib/playDesignerConvert.ts`.

## Phased plan

1. **Data layer (no auth).** Create the Supabase project; apply schema; seed existing plays into a single "Mousetrap" team; switch the **Viewer to read from the DB** (temporary public-read policy on published plays). De-risks the migration with zero user-facing change. *(Implementation plan: `2026-07-14-accounts-and-auth-phase-1-data-layer.md`.)*
2. **Auth + identity.** Add Supabase Auth (Google OAuth) via `@supabase/ssr`; sign-in/out; seed the Mousetrap team's memberships; gate nothing yet beyond sign-in.
3. **Roles + authoring in production.** Tighten RLS to membership-scoped; convert publish/save-draft/delete to coach-gated server actions; move drafts to the `draft` table. Coaches now author on the live site; players view.
4. **Progress sync.** Move viewer progress to `progress` per user; keep a localStorage fallback for signed-out visitors.
5. **Multi-tenant turn-on.** Allow creating a team + inviting members + a team switcher. Mostly UX — data is already `team_id`-scoped.

## Verification

Per project policy, no automated tests. Each phase verified by hand + a production build: Phase 1 confirms the Viewer renders identical content sourced from the DB; later phases confirm sign-in, role gating (a `player` cannot publish), and tenant isolation (a member of team A cannot read team B's plays — test with two teams even while only Mousetrap is "real").

## Open questions

- **Free project slot**: confirm a second Supabase free project is available (prerequisite for Phase 1).
- Do we keep the committed `.ts` plays as a permanent seed/backup, or retire them once the DB is source of truth?

**Resolved:** sign-in = **Google OAuth only** for now (magic link can come later); drafts = a dedicated per-user **`draft` table** (not `play.status`).
