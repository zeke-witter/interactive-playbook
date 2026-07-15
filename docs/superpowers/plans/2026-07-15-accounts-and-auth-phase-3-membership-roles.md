# Accounts & Auth — Phase 3: Membership, Roles & Invites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).
> **Next 16** — server actions + route handlers; the session refresh lives in `src/proxy.ts` (not `middleware.ts`). Read installed docs before framework code.

**Goal:** Turn identity into **team membership with roles**, and give admins/captains a way to **invite people onto a team by email** and manage them. After this phase the sole admin (you) can add the first real users to Mousetrap, promote a captain, and remove people — all from the live site. The Viewer stays **fully public**; personal playbooks and the submit/approve flow are Phases 4–5.

Design: `docs/superpowers/specs/2026-07-15-teams-roles-personal-playbooks-and-approval-design.md`.

## Global Constraints
- **Free tier only.** No new paid services; no Supabase custom domain.
- **`service_role` stays out of the app.** All privileged logic runs in `SECURITY DEFINER` database functions/triggers (which can read `auth.users`), never a service-role client in a server action. App code only does RLS-gated table reads/writes.
- **No automated tests.** Verify with `tsc`, a production build, and manual two-account checks.
- **Viewer stays public.** The Phase-1 public-read policy on published team plays is retained; do not gate viewing.
- **No changes to `play` yet** — personal/pending columns are Phase 4/5. Phase 3 only touches identity/membership tables + UI.

---

### Task 1: Migration `0005` — roles, RLS helpers, membership/team/invite policies

**File:** `supabase/migrations/0005_membership_roles.sql`. Apply via MCP.

- [ ] **Step 1: Rename the role.** `alter type member_role rename value 'coach' to 'captain';` (no rows yet → clean). Final values `('captain','player')`.
- [ ] **Step 2: Private-schema RLS helpers.** Put them in a **non-exposed `private` schema** so PostgREST doesn't publish them as RPC (avoids the SECURITY DEFINER advisor warnings we saw in Phase 2) while RLS policies can still call them. `SECURITY DEFINER` bypasses RLS on the inner `membership` read, which prevents policy recursion.
```sql
create schema if not exists private;
create function private.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profile where user_id = auth.uid()), false) $$;
create function private.is_member(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from membership where team_id = t and user_id = auth.uid()) $$;
create function private.is_captain(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from membership where team_id = t and user_id = auth.uid() and role = 'captain') $$;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(), private.is_member(uuid), private.is_captain(uuid) to authenticated;
```
- [ ] **Step 3: `membership` policies** (RLS already enabled in Phase 1):
```sql
create policy "members read co-members" on membership for select to authenticated
  using (private.is_member(team_id) or private.is_admin());
create policy "captains manage membership" on membership for all to authenticated
  using (private.is_captain(team_id) or private.is_admin())
  with check (private.is_captain(team_id) or private.is_admin());
```
- [ ] **Step 4: `team` policies** (RLS enabled, no policies yet):
```sql
create policy "members read their teams" on team for select to authenticated
  using (private.is_member(id) or private.is_admin());
create policy "admin manages teams" on team for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
```
- [ ] **Step 5: `pending_membership` table + policies + claim triggers.**
```sql
create table pending_membership (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references team(id) on delete cascade,
  email text not null,
  role member_role not null default 'player',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_id, email)
);
alter table pending_membership enable row level security;
create policy "captains manage invites" on pending_membership for all to authenticated
  using (private.is_captain(team_id) or private.is_admin())
  with check (private.is_captain(team_id) or private.is_admin());

-- Invite claim, path A: invitee already has an account → promote immediately.
create function claim_pending_membership() returns trigger
  language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(new.email);
  if uid is not null then
    insert into membership (team_id, user_id, role) values (new.team_id, uid, new.role)
      on conflict (team_id, user_id) do update set role = excluded.role;
    delete from pending_membership where id = new.id;
  end if;
  return null;
end $$;
create trigger on_pending_membership_insert after insert on pending_membership
  for each row execute function claim_pending_membership();
revoke execute on function claim_pending_membership() from public, anon, authenticated;
```
- [ ] **Step 6: Update `handle_new_user`** (invite claim, path B: brand-new signup claims any invites for its email):
```sql
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (user_id, display_name, is_admin)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          lower(new.email) = 'thevoiceofzeke@gmail.com')
  on conflict (user_id) do nothing;

  insert into membership (team_id, user_id, role)
    select pm.team_id, new.id, pm.role from pending_membership pm where lower(pm.email) = lower(new.email)
  on conflict (team_id, user_id) do nothing;
  delete from pending_membership where lower(email) = lower(new.email);
  return new;
end $$;
```
- [ ] **Step 7: Grants.** `grant select, insert, update, delete on membership to authenticated; grant select on team to authenticated; grant select, insert, update, delete on pending_membership to authenticated; grant all on those to service_role;` (RLS still gates rows.)
- [ ] **Step 8: Apply + advisors.** Confirm no new WARN (helpers hidden in `private`; trigger fns execute-revoked).

> **Invite design (refinement):** the app never reads `auth.users`. A captain/admin just inserts a `pending_membership` row (RLS-gated). Two triggers claim it — `claim_pending_membership` promotes it instantly if the person already has an account; `handle_new_user` claims it when a brand-new invitee first signs in. Covers both cases with no service-role client in app code.

---

### Task 2: Seed the admin's Mousetrap membership

- [ ] One-off (via MCP `execute_sql`, not a migration — avoids hardcoding generated ids):
```sql
insert into membership (team_id, user_id, role)
select t.id, u.id, 'captain' from team t, auth.users u
where t.name = 'Mousetrap' and lower(u.email) = 'thevoiceofzeke@gmail.com'
on conflict (team_id, user_id) do nothing;
```

---

### Task 3: Server actions for member management

**File:** `src/app/team/actions.ts` (`'use server'`). Each action re-checks the caller's role in code (defense in depth) even though RLS enforces it.

- [ ] `inviteMember(teamId, email, role)` — verify caller is captain(team)/admin; `insert into pending_membership {team_id, email: lower, role, invited_by}` (the trigger promotes existing users). Handle unique-violation gracefully.
- [ ] `removeMember(teamId, userId)` — delete membership. Guard: refuse if it would remove the **last captain**; a non-admin cannot remove the global admin.
- [ ] `setMemberRole(teamId, userId, role)` — update membership. Same last-captain guard.
- [ ] `cancelInvite(pendingId)` — delete pending_membership row.
- [ ] Revalidate the `/team` path after each mutation.

---

### Task 4: Management UI (`/team`)

**Files:** `src/app/team/page.tsx` (server), plus small client components for the forms.

- [ ] **Gate:** server component reads `getCurrentProfile()`; if not admin and not a captain of the (single, for now) Mousetrap team → `notFound()`. URL-only, like `/designer`.
- [ ] **Contents:** team name; **Members** list (display name from `profile` + role, with role select + remove for each); **Pending invites** list (email + role + cancel); an **add-by-email** form (email + role). Use design tokens + the material button style from `AuthButton`.
- [ ] **Entry link:** extend `getCurrentProfile()` to also return `canManage` (`is_admin` OR has any `captain` membership). In `AuthButton` (signed-in state) show a "Manage team" link when `canManage`.

---

### Task 5: Build + manual verification (two accounts)

- [ ] `npx tsc --noEmit`; `npm run build`.
- [ ] As **admin**: open `/team`, invite a second Google account by email (as `player`). A `pending_membership` row appears (invitee hasn't signed in yet).
- [ ] Sign in as the **second** account → it's auto-added to Mousetrap as `player` (invite claimed); pending row gone. As that player, `/team` is **not** accessible (notFound).
- [ ] As admin, promote the second account to `captain`; confirm they can now reach `/team`. Demote back; confirm access removed.
- [ ] Invite an **already-signed-in** account by email → membership appears immediately (path A trigger), no pending row.
- [ ] Viewer still fully public (signed-out home + `/plays/*` render).
- [ ] `get_advisors` (security) — clean.
- [ ] **Commit** (gated on user go-ahead).

---

## Self-Review Notes
- **No service_role in app.** Privileged reads (`auth.users`) happen only in `SECURITY DEFINER` triggers; the app does RLS-gated table ops. Matches the design constraint.
- **RLS helpers in `private`** keep the SECURITY DEFINER surface off the public API (no advisor warnings) while remaining usable in policies; SECURITY DEFINER also avoids membership-policy recursion.
- **Viewer unaffected** — public-read policy on published plays retained; `play` table untouched this phase.
- **Deferred:** personal playbooks + DB authoring (Phase 4), submit/approve (Phase 5), team creation / multi-team switcher (Phase 7). Guards beyond last-captain (e.g. self-demotion nuances) can harden later.

---

## Execution notes (2026-07-15)

Built on branch `feat/membership-phase-3`.

- **Migration `0005_membership_roles`** applied: `coach`→`captain`; `private` helper fns; membership/team/pending_membership RLS; `pending_membership` table; both claim triggers; `handle_new_user` updated; grants. Admin seeded as captain of Mousetrap (via `execute_sql`, not a migration).
- **App:** `getCurrentProfile()` now returns `canManage`; server actions in `src/app/team/actions.ts` (invite/setRole/remove/cancel, with last-captain + admin guards); `/team` page + `TeamPanel` client UI; "Manage team" link in `AuthButton` for admins/captains.
- **Automated verification done:** `tsc` clean; production build OK (`/team` route present). **Claim triggers verified directly in the DB** — an invite to a non-existent email stays `pending`; an invite to an existing account (case-insensitive) is promoted to `membership` and the pending row deleted. `/team` returns 404 when signed out; Viewer still public. Advisors clean (only expected `draft`/`progress` INFOs; the `auth_leaked_password_protection` WARN is N/A — Google-only, no passwords).
- **Remaining (manual, human-only):** in-browser two-account run — invite a second Google account from `/team`, sign in as them (auto-added as `player`, `/team` 404s for them), then promote→captain (gains `/team`) and demote back. I can confirm the resulting rows via MCP.
