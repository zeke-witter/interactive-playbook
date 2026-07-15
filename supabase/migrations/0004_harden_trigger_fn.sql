-- Accounts & Auth — Phase 2 hardening.
-- Postgres grants EXECUTE on new functions to PUBLIC by default, which exposes
-- the SECURITY DEFINER trigger function `handle_new_user` as a callable RPC to
-- anon/authenticated (flagged by the security advisor). The function is only
-- ever invoked by the `on_auth_user_created` trigger, which fires as the
-- function owner regardless of these grants — so revoking EXECUTE from the API
-- roles closes the exposure with no behavioral change.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
