-- Phase 3 addendum: let the global admin create/manage teams from the app.
-- The "admin manages teams" RLS policy (0005) already restricts these rows to
-- the admin, but the authenticated role also needs the table-level DML grant.
grant insert, update, delete on team to authenticated;
