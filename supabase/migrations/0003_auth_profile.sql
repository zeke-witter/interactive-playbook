-- Accounts & Auth — Phase 2: identity.
-- See docs/superpowers/specs/2026-07-15-teams-roles-personal-playbooks-and-approval-design.md
--
-- Adds a `profile` row per auth user (stable display name + the sole global
-- admin flag) and a sign-in trigger that creates it. NOTHING is gated this
-- phase — the Viewer stays public; this only establishes identity.
--
-- NOTE: the trigger deliberately does NOT claim pending_membership here — that
-- table arrives in Phase 3, and the claim logic is added to this trigger then.

create table profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table profile enable row level security;

-- Display names are not sensitive; any signed-in user may read profiles (sets
-- up roster display names in later phases). There is intentionally NO
-- user-facing INSERT/UPDATE policy: profiles are written only by the trigger
-- (security definer) and service_role, so a user cannot self-set is_admin.
create policy "authenticated read profiles"
  on profile for select to authenticated using (true);

-- Profile creation + sole-admin flag on first sign-in.
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
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- MCP-created tables don't inherit Supabase's default DML grants (see 0002).
grant select on table profile to authenticated;
grant all on table profile to service_role;
