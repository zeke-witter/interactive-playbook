-- Accounts & Auth — Phase 4: personal playbooks + production authoring.
-- Adds personal scope to `play` (team_id nullable, owner_id), rewrites play RLS
-- for personal/team/captain/admin visibility + writes, moves drafts to per-user
-- DB rows, and grants DML to authenticated. No service_role in app code — all
-- authoring runs as the signed-in user under these policies.

-- ---------------------------------------------------------------------------
-- play: personal scope
-- ---------------------------------------------------------------------------
alter table play add column owner_id uuid references auth.users(id) on delete set null;
alter table play alter column team_id drop not null;               -- null => personal play

alter table play drop constraint play_team_id_slug_key;
create unique index play_team_slug_uq     on play(team_id, slug) where team_id is not null;
create unique index play_personal_slug_uq on play(owner_id, slug) where team_id is null;
alter table play add constraint play_scope_ck check (team_id is not null or owner_id is not null);

-- ---------------------------------------------------------------------------
-- play RLS — replace the Phase-1 public-read policy with the full set.
-- SECURITY: the new public policy adds `team_id is not null` so a personal play
-- (team_id null) can NEVER be world-readable, even at status='published'.
-- ---------------------------------------------------------------------------
drop policy "phase1 public read published plays" on play;

-- SELECT (permissive, OR'd together)
create policy "public read published team plays" on play for select to anon, authenticated
  using (team_id is not null and status = 'published');
create policy "owners read personal plays" on play for select to authenticated
  using (team_id is null and owner_id = auth.uid());
create policy "authors read own team submissions" on play for select to authenticated
  using (team_id is not null and created_by = auth.uid());
create policy "captains read team plays" on play for select to authenticated
  using (team_id is not null and private.is_captain(team_id));
create policy "admin reads all plays" on play for select to authenticated
  using (private.is_admin());

-- INSERT  (player submit->pending lands in Phase 5)
create policy "insert personal play" on play for insert to authenticated
  with check (team_id is null and owner_id = auth.uid());
create policy "captains insert team play" on play for insert to authenticated
  with check (team_id is not null and (private.is_captain(team_id) or private.is_admin()));

-- UPDATE
create policy "update personal play" on play for update to authenticated
  using (team_id is null and owner_id = auth.uid())
  with check (team_id is null and owner_id = auth.uid());
create policy "captains update team play" on play for update to authenticated
  using (team_id is not null and (private.is_captain(team_id) or private.is_admin()))
  with check (team_id is not null and (private.is_captain(team_id) or private.is_admin()));

-- DELETE
create policy "delete personal play" on play for delete to authenticated
  using (team_id is null and owner_id = auth.uid());
create policy "captains delete team play" on play for delete to authenticated
  using (team_id is not null and (private.is_captain(team_id) or private.is_admin()));

-- ---------------------------------------------------------------------------
-- draft: per-user, personal WIP has no team
-- ---------------------------------------------------------------------------
alter table draft alter column team_id drop not null;
alter table draft drop constraint draft_team_id_user_id_name_key;
create unique index draft_user_name_uq on draft(user_id, name);
create policy "owners manage drafts" on draft for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (RLS still gates rows). anon keeps SELECT on play (public read).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on play to authenticated;
grant select, insert, update, delete on draft to authenticated;
grant all on play to service_role;
grant all on draft to service_role;
