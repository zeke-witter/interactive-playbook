-- Accounts & Auth — Phase 3: membership, roles & invites.
-- See docs/superpowers/plans/2026-07-15-accounts-and-auth-phase-3-membership-roles.md
--
-- Membership-scoped RLS + invite-by-email. The Viewer stays fully public (the
-- Phase-1 public-read policy on published team plays is untouched). No changes
-- to `play` this phase. No service_role in app code: privileged reads of
-- auth.users happen only in SECURITY DEFINER triggers.

-- 1. Rename the elevated role (no membership rows exist yet → clean rename).
alter type member_role rename value 'coach' to 'captain';

-- 2. RLS helper predicates in a NON-EXPOSED `private` schema (not published as
--    RPC → no SECURITY DEFINER advisor warnings). SECURITY DEFINER bypasses RLS
--    on the inner membership read, avoiding membership-policy recursion.
create schema if not exists private;

create function private.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profile where user_id = auth.uid()), false)
$$;
create function private.is_member(t uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from membership where team_id = t and user_id = auth.uid())
$$;
create function private.is_captain(t uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from membership where team_id = t and user_id = auth.uid() and role = 'captain')
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin(), private.is_member(uuid), private.is_captain(uuid) to authenticated;

-- 3. membership policies (RLS already enabled in 0001).
create policy "members read co-members" on membership for select to authenticated
  using (private.is_member(team_id) or private.is_admin());
create policy "captains manage membership" on membership for all to authenticated
  using (private.is_captain(team_id) or private.is_admin())
  with check (private.is_captain(team_id) or private.is_admin());

-- 4. team policies (RLS enabled in 0001, no policies yet).
create policy "members read their teams" on team for select to authenticated
  using (private.is_member(id) or private.is_admin());
create policy "admin manages teams" on team for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- 5. pending_membership: invites keyed by email until the person signs in.
create table pending_membership (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references team(id) on delete cascade,
  email      text not null,
  role       member_role not null default 'player',
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

-- 6. Update the sign-in trigger — path B: a brand-new invitee claims invites
--    addressed to its email on first sign-in.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (user_id, display_name, is_admin)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          lower(new.email) = 'thevoiceofzeke@gmail.com')
  on conflict (user_id) do nothing;

  insert into membership (team_id, user_id, role)
    select pm.team_id, new.id, pm.role from pending_membership pm where lower(pm.email) = lower(new.email)
  on conflict (team_id, user_id) do nothing;
  delete from pending_membership where lower(email) = lower(new.email);
  return new;
end $$;

-- 7. Grants (RLS still gates rows).
grant select, insert, update, delete on membership to authenticated;
grant select on team to authenticated;
grant select, insert, update, delete on pending_membership to authenticated;
grant all on pending_membership to service_role;
