-- Accounts & Auth — Phase 1: table privileges.
-- Tables created by the migration tool did not inherit Supabase's default DML
-- grants, so the api roles only had REFERENCES/TRIGGER/TRUNCATE. Grant the
-- privileges each role actually needs; RLS remains the row-level guard.

grant usage on schema public to anon, authenticated, service_role;

-- Server/seed role bypasses RLS and needs full DML on every table.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Phase 1 public read path: the Viewer reads published plays with the anon key.
-- Row visibility is still gated by the "phase1 public read published plays" RLS
-- policy. Other tables stay grant-less for anon/authenticated (RLS-enabled with
-- no policies => inaccessible) until their owning phases add policies + grants.
grant select on table play to anon, authenticated;
