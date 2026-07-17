-- Per-team roster names + team division.
--
-- Until now every team's plays rendered with the hardcoded Mousetrap roster
-- (src/data/names.ts, sampled client-side in useRoster). This makes rosters
-- team-owned: captains/admin add cutter & handler names for their team, and the
-- Viewer draws that play's team's names. Teams also gain a `division`
-- (open/women/mixed) — only mixed teams need the gendered line ratio; single-
-- division teams draw from one pool.
--
-- Follows the project conventions: reuse the private.is_captain / private.is_admin
-- predicates (0005), and EXPLICITLY grant DML (MCP-created tables don't inherit
-- Supabase's default grants).

-- 1. Team division ----------------------------------------------------------
create type team_division as enum ('open', 'women', 'mixed');
alter table team add column division team_division not null default 'mixed';

-- MUFABots is a U20 boys team; Mousetrap stays mixed (the default).
update team set division = 'open' where name = 'MUFABots (U20B)';

-- 2. roster_name ------------------------------------------------------------
-- gender is only meaningful for mixed teams; single-division teams store the
-- default and the sampler ignores it.
create table roster_name (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references team(id) on delete cascade,
  role       text not null check (role in ('cutter', 'handler')),
  gender     text not null default 'mmp' check (gender in ('mmp', 'fmp')),
  name       text not null,
  created_at timestamptz not null default now()
);
create index roster_name_team_idx on roster_name(team_id);

alter table roster_name enable row level security;

-- Names are non-sensitive and plays are already world-readable, so read is
-- world-open (mirrors `formation`). Writes are captain/admin only.
create policy "public reads roster names" on roster_name for select to anon, authenticated using (true);
create policy "captains manage roster names" on roster_name for all to authenticated
  using (private.is_captain(team_id) or private.is_admin())
  with check (private.is_captain(team_id) or private.is_admin());

grant select on roster_name to anon, authenticated;
grant insert, update, delete on roster_name to authenticated;
grant all on roster_name to service_role;

-- 3. Team reads/writes for this feature -------------------------------------
-- Captains need to set their team's division (team was admin-write only).
create policy "captains update their team" on team for update to authenticated
  using (private.is_captain(id) or private.is_admin())
  with check (private.is_captain(id) or private.is_admin());
grant update on team to authenticated;

-- The Viewer needs a team's division at render time, including for signed-out
-- users. Team was members-only readable; expose (to anon too) exactly the teams
-- that have a published play — i.e. teams whose plays are already public.
create policy "public reads teams with published plays" on team for select to anon, authenticated
  using (exists (select 1 from play p where p.team_id = team.id and p.status = 'published'));
grant select on team to anon;

-- 4. Seed Mousetrap from the previous hardcoded names -----------------------
insert into roster_name (team_id, role, gender, name)
select t.id, 'cutter', 'mmp', v.name
from team t cross join (values
  ('Kwast'), ('Pizzo'), ('BP'), ('Alex'), ('Tyler'), ('Gabe'), ('Diva'), ('Zork'), ('Spencer')
) as v(name)
where t.name = 'Mousetrap';

insert into roster_name (team_id, role, gender, name)
select t.id, 'cutter', 'fmp', v.name
from team t cross join (values
  ('Cameo'), ('Elfie'), ('Marv'), ('Abi'), ('Izzie'), ('Olivia'), ('Kaden'), ('Veiga'), ('Emily'), ('Mary'), ('Nicole')
) as v(name)
where t.name = 'Mousetrap';

insert into roster_name (team_id, role, gender, name)
select t.id, 'handler', 'mmp', v.name
from team t cross join (values
  ('Zeke'), ('TJ'), ('Kevin'), ('Zach'), ('Erik'), ('Dylan'), ('Matthew')
) as v(name)
where t.name = 'Mousetrap';

insert into roster_name (team_id, role, gender, name)
select t.id, 'handler', 'fmp', v.name
from team t cross join (values
  ('Catherine'), ('Lily'), ('Rani')
) as v(name)
where t.name = 'Mousetrap';
