# Teams, Roles, Personal Playbooks & Approval Workflow — Design

> Extends `2026-07-14-accounts-and-auth-design.md`. That doc chose the stack (Supabase Auth + Postgres + RLS, `@supabase/ssr`, Google-only sign-in, free-tier-only) and shipped **Phase 1** (DB-backed Viewer, no auth — see `2026-07-15`-era PR #1). This doc specifies the identity/role/authoring rounds that follow, and adds three capabilities the original design did not cover: **personal playbooks**, a **submit-for-approval workflow**, and a **global admin** tier. Where the two disagree, this doc wins.

## Problem / new requirements

We want to invite the first real users to author plays. That needs identity, teams, roles, and two playbook scopes:

- **Regular users (`player`)** — import a team play to edit, create new plays, and on publish choose **either** "save to my personal playbook" **or** "submit to a team for approval." They need a management view: their personal plays (edit/delete), submit-to-team, and the status of pending submissions.
- **Elevated users (`captain`)** — directly edit/delete/hide plays in their team's playbook, approve/deny submissions, and manage roles & membership of their team. (Later: add categories.)
- **Admin (one person: `thevoiceofzeke@gmail.com`)** — all of the above on any team, plus create teams and manage users/roles globally.

## Resolved decisions (this round)

- **Submit = snapshot copy.** Submitting a personal play inserts an **independent** team-play row (`status='pending'`); the personal copy is untouched. (Not move, not linked-versioning.)
- **Invites = pre-add by Google email.** An admin/captain adds a member by email → a `pending_membership` row → activated into a real `membership` on that person's **first Google sign-in** (matched by email). No transactional email required (fits Google-only + free tier).
- **Personal playbook privacy = owner + admin only.** Captains never see a teammate's personal playbook — only what's submitted to the team.
- **Sole admin** = `thevoiceofzeke@gmail.com`, set by the sign-in trigger.
- **Viewing stays fully public.** Published team plays remain world-readable (today's behavior preserved). Sign-in only gates authoring, personal plays, submissions, and management. Personal / `pending` / `hidden` / `denied` plays are never public.

## RBAC matrix (target)

| Action | player | captain | admin |
|---|:--:|:--:|:--:|
| View published team plays (public) | ✅ | ✅ | ✅ |
| CRUD own **personal** plays | ✅ | ✅ | ✅ |
| Import team play → personal (copy) | ✅ | ✅ | ✅ |
| Submit personal → team (`pending`) | ✅ | ✅ | ✅ |
| See own submissions' status | ✅ | ✅ | ✅ |
| Approve / deny pending team plays | — | ✅ own team | ✅ any |
| Edit / delete / hide team plays | — | ✅ own team | ✅ any |
| Manage member roles & membership | — | ✅ own team | ✅ any |
| Create teams; manage all users/roles | — | — | ✅ |
| Add categories (later) | — | ✅ | ✅ |

## Data model

Deltas on the Phase-1 tables (`team`, `membership`, `play`, `draft`, `progress`). New: `profile`, `pending_membership`.

### New: `profile` (one row per auth user)

Needed independently: real users need **stable display names** (rosters are random today), and `is_admin` is how a *global* admin is expressed (a per-team enum cannot say "global").

```sql
create table profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);
```

### Sign-in bootstrap trigger

Creates the profile (Google display name), seeds the sole admin, and **claims invites** addressed to the new user's email:

```sql
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (user_id, display_name, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    lower(new.email) = 'thevoiceofzeke@gmail.com'   -- sole global admin
  )
  on conflict (user_id) do nothing;

  insert into membership (team_id, user_id, role)
    select pm.team_id, new.id, pm.role
    from pending_membership pm
    where lower(pm.email) = lower(new.email)
  on conflict (team_id, user_id) do nothing;

  delete from pending_membership where lower(email) = lower(new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### `member_role`: rename `coach` → `captain`

No membership rows exist yet, so this is a clean value rename: `alter type member_role rename value 'coach' to 'captain';` → final `('captain','player')`.

### `play`: add personal scope + review trail

```sql
alter table play add column owner_id uuid references auth.users(id) on delete set null;
alter table play alter column team_id drop not null;               -- null = personal

alter table play drop constraint play_team_id_slug_key;            -- old unique(team_id,slug)
create unique index play_team_slug_uq     on play(team_id, slug) where team_id is not null;
create unique index play_personal_slug_uq on play(owner_id, slug) where team_id is null;
alter table play add constraint play_scope_ck check (team_id is not null or owner_id is not null);

-- expanded status (enum ADD VALUE runs in its own migration/statement, not mid-txn)
alter type play_status add value 'pending';
alter type play_status add value 'hidden';
alter type play_status add value 'denied';

alter table play add column reviewed_by uuid references auth.users(id);
alter table play add column reviewed_at timestamptz;
alter table play add column review_note text;
```

- **Personal play**: `team_id IS NULL`, `owner_id = author`, `status='published'` (status is meaningless for personal — the null team_id is what makes it personal).
- **Team play**: `team_id` set; `status ∈ {pending, published, hidden, denied}`; `created_by` = submitter/author; review columns filled on approve/deny.
- A submission is just a `pending` team row. The submitter watches its status; a captain flips it to `published` (approve) or `denied` (deny, with `review_note`).

### New: `pending_membership`

```sql
create table pending_membership (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references team(id) on delete cascade,
  email      text not null,
  role       member_role not null default 'player',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_id, email)
);
```

### `draft`

`team_id` becomes nullable (personal authoring WIP has no team); key on `(user_id, name)`. Drafts hold the nested `DesignerStep[]` tree, as today.

## Authorization (RLS)

`SECURITY DEFINER` helpers avoid membership-policy recursion:

```sql
create function is_admin()        returns boolean language sql stable security definer set search_path=public
  as $$ select coalesce((select is_admin from profile where user_id = auth.uid()), false) $$;
create function is_member(t uuid) returns boolean language sql stable security definer set search_path=public
  as $$ select exists(select 1 from membership where team_id=t and user_id=auth.uid()) $$;
create function is_captain(t uuid) returns boolean language sql stable security definer set search_path=public
  as $$ select exists(select 1 from membership where team_id=t and user_id=auth.uid() and role='captain') $$;
```

**`play`** (multiple permissive policies OR together):

- SELECT: `(team_id is not null and status='published')`  *(public, keeps site open)*
  · OR `(team_id is null and owner_id = auth.uid())`  *(own personal)*
  · OR `(team_id is not null and created_by = auth.uid())`  *(own submissions, any status)*
  · OR `(team_id is not null and is_captain(team_id))`  *(captains see all their team's plays)*
  · OR `is_admin()`.
- INSERT (`with check`): own personal `(team_id is null and owner_id=auth.uid())` · OR member submission `(team_id is not null and status='pending' and created_by=auth.uid() and is_member(team_id))` · OR captain/admin team play `(team_id is not null and (is_captain(team_id) or is_admin()))`.
- UPDATE: own personal · OR `(team_id is not null and (is_captain(team_id) or is_admin()))` *(approve/deny/hide/edit)*.
- DELETE: own personal (or admin) · OR captain/admin for team plays.

**`membership`**: SELECT `is_member(team_id) or is_admin()`; write `is_captain(team_id) or is_admin()`.
**`team`**: SELECT members+admin; write admin only.
**`pending_membership`**: captains of that team + admin.
**`profile`**: SELECT authenticated (display names aren't sensitive); UPDATE self *(display_name only)* + admin. `is_admin` is **never** self-settable — enforced by routing profile writes through a server action / a guard trigger, not a broad self-update policy.
**`draft` / `progress`**: owner-only (`user_id = auth.uid()`), admin read.

Grants: `authenticated` gains INSERT/UPDATE/DELETE on `play` (+ needed grants on `profile`, `membership`, `pending_membership`, `draft`, `progress`); `anon` keeps `SELECT` on `play` (public read). *(Reminder from Phase 1: MCP-created tables don't inherit default DML grants — grant explicitly.)*

**Defense in depth:** all mutations run in **server actions** that re-check `auth.uid()` + role in code, even though RLS already enforces it.

## App / architecture

- **`@supabase/ssr`**: add `middleware.ts` (session refresh), a **browser client** (`src/lib/supabase/client.ts`) for the sign-in button, and `/auth/callback/route.ts` (`exchangeCodeForSession`). The existing server client (`src/lib/supabase/server.ts`) already has the cookie wiring.
- **Google OAuth**: `signInWithOAuth({ provider: 'google' })`. Requires **out-of-band setup** (see below). No new client env vars — OAuth is brokered by Supabase.
- **Authoring moves to server actions**, retiring the dev-only `ts-morph` API routes (`/api/designer/publish`, `save`, `drafts`, `narrative`). This is what unlocks **authoring in production**. Actions: `upsertPersonalPlay`, `deletePersonalPlay`, `importTeamPlayToPersonal`, `submitToTeam`, `approveSubmission`/`denySubmission`, `upsertTeamPlay`/`hideTeamPlay`/`deleteTeamPlay`, `addPendingMember`/`removeMember`/`setMemberRole`, `createTeam`, `setUserAdmin`.
- **UIs**:
  - Header: sign-in/out + display name.
  - **My Playbook** (`/my-playbook`): personal plays (open in Designer, delete), submit-to-team, and a status column for submissions (`pending`/`published`/`denied` + note).
  - **Designer publish dialog**: choose *Save to my playbook* vs *Submit to <team> for approval*; captains also get *Publish to team directly*.
  - **Team console** (captain/admin): approval queue (approve/deny + note), team plays (edit/hide/delete), members (add by email, set role, remove).
  - **Admin** (admin only): create teams, list/manage users & roles.

## Phasing — status as of 2026-07-16

Phases 2–5 are **shipped and live in production**; the app is being **piloted as-is** (single admin-provisioned team, Mousetrap).

2. **Auth & identity** — ✅ SHIPPED. Google sign-in, `profile` + sign-in trigger, sole admin seeded.
3. **Membership & RLS** — ✅ SHIPPED. `captain` role, `private` RLS helpers, membership-scoped policies (public read retained for published team plays), `pending_membership` invite-by-email with dual claim triggers, `/team` member management. **Admin team creation was brought forward here** (migration `0006`).
4. **Personal playbooks + production authoring** — ✅ SHIPPED. `play` owner/personal scope, DB drafts, DB-backed authoring via server actions (dev-only ts-morph routes retired), import team→personal, **My Playbook**, the **active-playbook** model (Designer breadcrumb + file modal, viewer "Playbook" selector), captain team-play management (edit/hide/delete), global nav, and **admin-editable formation templates** (migration `0009`).
5. **Submission & approval** — ✅ SHIPPED. `pending`/`denied` + review columns (`0010`), member submit (from Designer + My Playbook), captain approval queue on `/team`.
6. **Progress sync** — ❌ DROPPED. Study-progress tracking was removed entirely (never surfaced in the UI); the `progress` table was dropped (`0011`).
7. **"Open it up" (multi-tenant self-service)** — ⏸️ PARKED. See below.

### Phase 7 (parked) — remaining work to let *other* teams run themselves

The app is already multi-tenant in the data model (`team_id`-scoped) and supports admin-provisioned teams, invites, per-team playbooks, and per-team viewer/designer selectors. What's **not** built — and is only needed to open the app beyond the single Mousetrap pilot to the public internet:

- **Self-serve team creation** — today only the global admin can create teams (`team` insert is admin-only RLS). Would need: non-admin team creation that auto-makes the creator a `captain`, surfaced in the normal UI.
- **Team lifecycle & self-management** — rename team, delete/archive team (RLS allows delete; no UI), a member leaving a team, last-captain guards.
- **New-user onboarding** — a "create a team or join one" flow so a signed-in user with no team isn't stranded on the public viewer.
- **Dynamic categories & sets** — `category` (offense/defense) and `set` (ho-stack/vert-stack/flow/zone/endzone) are hardcoded in `lib/playLabels.ts` and drive the formations; making them team-configurable is the largest chunk. *Separable:* worth doing on its own if Mousetrap wants custom categories, independent of going multi-team.

**Decision gate:** revisit only if the app is opened to teams beyond Mousetrap. Until then, the admin-provisioned model is sufficient.

## Out-of-band setup (blocks Phase 2)

1. **Google Cloud**: create an OAuth 2.0 client (Web); authorized redirect URI = the Supabase auth callback (`https://htoqmozptttecxtygssn.supabase.co/auth/v1/callback`).
2. **Supabase → Auth → Providers → Google**: paste client id/secret; enable.
3. **Supabase → Auth → URL config**: Site URL + additional redirect URLs for `http://localhost:3000` and the prod domain (`playbook.thesiteofzeke.dev`).

## Verification (no automated tests — project policy)

Per phase, by hand + a production build, using **two Google accounts** to exercise role gating and isolation:
- a `player` cannot approve/deny, cannot edit a team play, cannot see another user's personal playbook;
- a `captain` can approve within their team but not another team;
- the sole admin (`thevoiceofzeke@gmail.com`) can do everything;
- public (signed-out) still sees published team plays, and sees nothing personal/pending/hidden/denied;
- invite-by-email activates a membership on first sign-in.

## Open questions / resolutions

- **Slug collisions (import)**: RESOLVED — importing a team play to a personal playbook auto-suffixes (`-2`, `-3`, …) when the owner already has that slug.
- **Slug collisions (submit)**: RESOLVED (Phase 5) — submitting to a team where the slug is already taken is **rejected** with a "rename it before submitting" message (no silent suffix in a shared playbook). Re-submitting/replacing a published team play (light versioning) remains a possible future enhancement, not built.
- **Guards**: DONE for last-captain removal/demotion and protecting the admin (enforced in `team/actions.ts`); broader self-demotion nuances can harden later.
- **Dynamic categories**: still open, parked under Phase 7 — move `category`/`set` from fixed `playLabels.ts` constants to per-team config.
```
