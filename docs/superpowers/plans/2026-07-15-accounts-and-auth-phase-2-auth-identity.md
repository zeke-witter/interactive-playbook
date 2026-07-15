# Accounts & Auth — Phase 2: Auth & Identity (Google sign-in + profiles) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **This is NOT stock Next.js** — Next 16 App Router. Read `node_modules/next/dist/docs/` (middleware, route handlers) and the installed `@supabase/ssr` package docs **before** writing middleware / the callback route.

**Goal:** Add Supabase Auth (Google OAuth) so users can sign in and out, and give every user a `profile` row (stable display name + the sole global-admin flag). **Nothing is gated beyond sign-in this phase** — the Viewer stays fully public, authoring stays as-is. This isolates the auth wiring before roles/RLS (Phase 3) and DB authoring (Phase 4).

Design: `docs/superpowers/specs/2026-07-15-teams-roles-personal-playbooks-and-approval-design.md` (and the original `2026-07-14-accounts-and-auth-design.md`).

**Prerequisite (DONE, out-of-band):** Google Cloud OAuth Web client created; Supabase → Auth → Google provider enabled with the client id/secret; Site URL + redirect URLs set for `http://localhost:3000` and `https://playbook.thesiteofzeke.dev`. Callback URI registered with Google: `https://htoqmozptttecxtygssn.supabase.co/auth/v1/callback`.

## Global Constraints

- **Free tier only.** No new paid services. No new npm deps — `@supabase/ssr` and `@supabase/supabase-js` are already installed.
- **No secrets added.** OAuth is brokered by Supabase; no client id/secret reaches the repo or env. The existing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are all the client needs. `SUPABASE_SERVICE_ROLE_KEY` stays local/seed-only.
- **No automated tests** (project policy). Verify with `npx tsc --noEmit`, a production build, and manual browser sign-in with two Google accounts.
- **Do not gate anything yet.** No RLS tightening, no role checks, no membership. Public read of plays is unchanged. Those are Phase 3.
- **Trigger scope:** the Phase-2 sign-in trigger creates the `profile` and sets the admin flag **only**. It must **not** reference `pending_membership` (a Phase-3 table) — that claim logic is added when Phase 3 creates the table.

---

### Task 1: Migration — `profile` table + sign-in trigger + RLS

**Files:** create `supabase/migrations/0003_auth_profile.sql`. Apply via the Supabase MCP `apply_migration` (name `0003_auth_profile`).

- [ ] **Step 1: Write the migration.**
```sql
create table profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table profile enable row level security;

-- Names are not sensitive; any signed-in user may read profiles (sets up
-- roster display names in later phases). No user-facing INSERT/UPDATE policy:
-- profiles are written only by the trigger (security definer) and service_role,
-- which prevents a user from self-setting is_admin. Editing display_name (safely,
-- display_name-only, via a server action) is deferred.
create policy "authenticated read profiles"
  on profile for select to authenticated using (true);

-- Profile creation + sole-admin flag on first sign-in. NOTE: no pending_membership
-- claim here — that is added in Phase 3 when the table exists.
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (user_id, display_name, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    lower(new.email) = 'thevoiceofzeke@gmail.com'
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```
- [ ] **Step 2: Grants.** As in Phase 1, MCP-created tables don't inherit default DML grants — grant explicitly (put in the same migration or a sibling):
```sql
grant select on table profile to authenticated;
grant all on table profile to service_role;
```
- [ ] **Step 3: Apply** via MCP `apply_migration`; confirm `to_regclass('public.profile')` is non-null and the trigger exists (`select tgname from pg_trigger where tgname='on_auth_user_created'`).
- [ ] **Step 4: Advisors.** Run `get_advisors` (security) — expect no new criticals (profile has RLS + a policy).

---

### Task 2: Supabase clients + session proxy

> **Next 16 note:** the `middleware` file convention is deprecated and renamed to **`proxy`** — implemented as `src/proxy.ts` exporting `proxy()`, not `src/middleware.ts`. (Confirmed against `node_modules/next/dist/docs/.../proxy.md`; Proxy defaults to the Node.js runtime, which the Supabase client needs.)

**Files:** create `src/lib/supabase/client.ts`, `src/proxy.ts`. (`src/lib/supabase/server.ts` already exists — its cookie wiring is ready.)

- [ ] **Step 1: Browser client** (`client.ts`) — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` per the installed `@supabase/ssr` docs. `'use client'`-safe (used by the sign-in button).
- [ ] **Step 2: Middleware** (`src/middleware.ts`) — refresh the auth session on each request per the `@supabase/ssr` App-Router guide (the `updateSession` pattern: create a server client bound to the request/response cookies, call `getUser()`, return the response so refreshed cookies are set). **Read the installed `@supabase/ssr` docs + Next 16 middleware docs first** — the cookie API and `matcher` config must match this version. Matcher should skip static assets and `/_next`.
- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`.

---

### Task 3: OAuth callback + auth actions

**Files:** create `src/app/auth/callback/route.ts`; a small server helper for sign-out and/or `getUser`.

- [ ] **Step 1: Callback route** (`auth/callback/route.ts`) — a GET route handler that reads `?code`, calls `supabase.auth.exchangeCodeForSession(code)` with the server client, then redirects to `next` (default `/`). Per the current `@supabase/ssr` docs (Next 16 route handler signature; `params`/`searchParams` conventions).
- [ ] **Step 2: `getUser` server helper** — a thin `getUser()` in `src/lib/supabase/server.ts` (or a new `auth.ts`) that returns the current `auth.users` user (or null) for server components. Use `supabase.auth.getUser()` (validates the JWT) — not `getSession()` — in server code.
- [ ] **Step 3: Sign-out** — a server action (or route) calling `supabase.auth.signOut()` and redirecting home.
- [ ] **Step 4: Typecheck.**

---

### Task 4: Sign-in / sign-out UI

**Files:** create `src/components/auth/AuthButton.tsx` (client); mount it in the home page (`src/app/page.tsx`) header block. Keep it minimal — this phase only proves auth works and surfaces the display name.

- [ ] **Step 1: AuthButton** (`'use client'`) — if signed out, a "Sign in with Google" button calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${location.origin}/auth/callback\` } })`. If signed in, show the display name + a "Sign out" control.
- [ ] **Step 2: Feed auth state** — the home page (server component) reads `getUser()` and, if present, the `profile` row (display name + is_admin), passing them to `AuthButton` as initial props (avoids a client round-trip flash). Keep the Viewer content unchanged and public.
- [ ] **Step 3: Do not add `/designer` or management links.** Phase 2 gates nothing and adds no authoring UI. (Respect the existing rule that `/designer` is URL-only.)
- [ ] **Step 4: Typecheck.**

---

### Task 5: Build + manual verification

- [ ] **Step 1: Production build.** `npm run build` — must succeed.
- [ ] **Step 2: Manual check** (`npm run dev`, two Google accounts):
  - Signed-out: home + `/plays/<slug>` still render publicly (no regression).
  - Sign in as **`thevoiceofzeke@gmail.com`** → redirected back signed in; `AuthButton` shows the Google display name. In the DB: one `auth.users` row and a `profile` row with **`is_admin = true`**.
  - Sign in as a **second** Google account → a `profile` row with `is_admin = false`.
  - Sign out returns to a signed-out state; plays still public.
  - Confirm no play/viewer behavior changed.
- [ ] **Step 3: Advisors** re-check (`get_advisors` security).
- [ ] **Step 4: Commit** (gated on user go-ahead).

---

## Self-Review Notes

- **No gating this phase** — RLS/roles/authoring are untouched; only identity is added. Rollback = remove the proxy + AuthButton + callback; the `profile` table/trigger are inert without sign-in.
- **Trigger is minimal on purpose** — profile + admin flag only; the `pending_membership` claim is deliberately deferred to Phase 3 so the trigger doesn't reference a table that doesn't exist yet.
- **Self-escalation guarded** — no user-facing write policy on `profile`, so a user cannot set their own `is_admin`; only the security-definer trigger and service_role write it.
- **`getUser()` not `getSession()`** in server code (validates the JWT server-side).
- **Admin identity** = `thevoiceofzeke@gmail.com` (per the design decision). If sign-in will use a different Google account, update the trigger's email literal before applying.

---

## Execution notes (2026-07-15)

Built on branch `feat/auth-phase-2`.

- **Tasks 1–4 done.** Migrations `0003_auth_profile` (profile + trigger + RLS + grants) and `0004_harden_trigger_fn` (revoke `EXECUTE` on the trigger fn from the API roles — closed a security-advisor WARN) applied via MCP; table/trigger/fn verified. Created `src/lib/supabase/client.ts`, `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/actions.ts` (sign-out), `src/components/auth/AuthButton.tsx`, and `getCurrentProfile()` in `server.ts`; wired `AuthButton` into the home page.
- **Deviation from plan:** used `src/proxy.ts` (Next 16 rename), not `src/middleware.ts`.
- **Automated verification done:** `tsc` clean; production build succeeds (`/auth/callback` route + `Proxy` both present); against the dev server — signed-out home shows "Sign in with Google", `/plays/flood` still public (200), `/auth/callback` with no code → 307 → `/?auth_error=1`. Security advisors clean (only the expected policy-less-table INFOs).
- **Remaining (manual, human-only):** the live Google sign-in click-through — can't be automated. Test on **localhost:3000** (the domain in Supabase's redirect allowlist + Google's JS origins; the Vercel preview domain is neither, and is behind deployment protection). After sign-in, verify the `profile` row (admin=true for the sole admin, false for a second account) — I can check this via MCP once you've signed in. Production sign-in works after merge (`playbook.thesiteofzeke.dev` is allowlisted).
```
