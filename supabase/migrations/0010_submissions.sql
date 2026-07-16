-- Accounts & Auth — Phase 5: submit → approve workflow.
-- Adds a review trail to `play` and lets a team member insert a `pending`
-- submission. Captains' approve/deny is already covered by the existing
-- "captains update team play" UPDATE policy; submitter/captain SELECTs already
-- exist (Phase 4).

alter table play add column reviewed_by uuid references auth.users(id);
alter table play add column reviewed_at timestamptz;
alter table play add column review_note text;

-- A member may create a play in a team they belong to, but only as a `pending`
-- submission authored by themselves. Promotion to `published` (approve) is a
-- captain-only UPDATE.
create policy "members submit pending team play" on play for insert to authenticated
  with check (
    team_id is not null
    and status = 'pending'
    and created_by = auth.uid()
    and private.is_member(team_id)
  );
