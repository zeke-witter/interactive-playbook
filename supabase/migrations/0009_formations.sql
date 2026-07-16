-- Admin-editable default formations (per set). Only stores OVERRIDES: the
-- committed DEFAULT_FORMATIONS constant remains the fallback for any set
-- without a row here. `data` is a PlayerState[] (the set's canonical layout).
-- `set` is a SQL keyword, so the column is `set_id`.
create table formation (
  set_id     text primary key,
  data       jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table formation enable row level security;

-- Formations are app-wide base layouts: world-readable, admin-only writes.
create policy "anyone reads formations" on formation for select to anon, authenticated using (true);
create policy "admin writes formations" on formation for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

grant select on formation to anon, authenticated;
grant insert, update, delete on formation to authenticated;
grant all on formation to service_role;
