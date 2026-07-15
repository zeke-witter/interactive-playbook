-- Accounts & Auth — Phase 1: data layer schema + Phase-1 RLS.
-- See docs/superpowers/specs/2026-07-14-accounts-and-auth-design.md
--
-- Phase 1 stands up the tables and seeds published plays for the single
-- "Mousetrap" team. There is no auth yet: published plays are world-readable
-- (matching today's public site). Membership-scoped read policies and
-- coach-gated writes arrive in Phase 3.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type member_role as enum ('coach', 'player');
create type play_status as enum ('published', 'archived');  -- drafts live in their own table

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table team (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  -- unique so the seed script can upsert on conflict (idempotent re-seed).
  unique (name)
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
  data         jsonb not null,                -- the flat published PlayStep[] tree, verbatim
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

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table team enable row level security;
alter table membership enable row level security;
alter table play enable row level security;
alter table draft enable row level security;
alter table progress enable row level security;

-- Phase 1 (no auth): published plays are publicly readable to match today's
-- public site. This policy is REPLACED by membership-scoped policies in Phase 3.
create policy "phase1 public read published plays"
  on play for select
  to anon, authenticated
  using (status = 'published');

-- No insert/update/delete policies yet: writes happen only via the seed script,
-- which uses the secret (service_role) key and bypasses RLS. team/membership/
-- draft/progress get their read/write policies in later phases; with RLS enabled
-- and no policies, they are inaccessible to anon/authenticated until then.
