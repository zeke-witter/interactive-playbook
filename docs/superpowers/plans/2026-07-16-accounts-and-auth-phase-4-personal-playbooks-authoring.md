# Accounts & Auth — Phase 4: Personal Playbooks & Production Authoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).
> **Next 16** — server actions + `'use client'` boundaries; session refresh is in `src/proxy.ts`. Read installed `next` + `@supabase/ssr` docs before framework code.

**Goal:** Move authoring off the **dev-only `ts-morph` file writes** into **DB-backed, role-gated server actions**, and give every signed-in user a **personal playbook**. After this phase, from the live site: anyone can tinker in the Designer; a signed-in user can save/publish plays to their **personal** playbook and see/manage them in **My Playbook**; a **captain/admin** can publish directly to a team's playbook and edit/hide/delete team plays. The player **submit→approve** queue is **Phase 5**. Viewer stays fully public for published team plays.

Design: `docs/superpowers/specs/2026-07-15-teams-roles-personal-playbooks-and-approval-design.md`.

## Product decisions (locked with user, 2026-07-16)
- **Designer access:** open to tinker; **Save/Publish require sign-in** (prompt at that moment). localStorage autosave still works for anonymous use.
- **Publish targets this phase:** *Save to my playbook* (everyone) + *Publish to `<team>` directly* (captains/admin). Player submit-for-approval → Phase 5.
- **Retire the dev-only routes** (`/api/designer/publish`, `save`, `drafts`, `drafts/[name]`, `plays/[playId]/narrative`). DB server actions are the only authoring path. ⇒ **named drafts move to the `draft` table** (files don't exist in prod). Committed `src/data/plays/*.ts` remain a historical **seed** only.

## Global Constraints
- **Free tier only.** No new services. **No `service_role` in app code** — authoring runs as the signed-in user under RLS, re-checked in the action.
- **No automated tests.** Verify with `tsc`, production build, and manual multi-account checks.
- **Do not touch** the field engine, `types/play.ts`/`types/designer.ts`, `lib/designerSteps.ts`, `lib/playDesignerConvert.ts`, or the branch-contiguity convention. Only *where plays are stored* and *who may write* changes.
- **`play.data` stays the flat `PlayStep[]`; `draft.data` the nested `DesignerStep[]`** — unchanged shapes (matches `playsRepo.rowToPlay` + today's `designer-output/*.json`).

---

### Task 1: Migration `0007` — expand `play_status` enum (enum-only, no usage)

**File:** `supabase/migrations/0007_play_status_values.sql`. Separate migration so later ones may *use* the new values (PG can't add + use an enum value in one txn).
- [ ] `alter type play_status add value if not exists 'pending'; ... 'hidden'; ... 'denied';` (`published`/`archived` already exist). `pending`/`denied` are for Phase 5 but cost nothing to add now; `hidden` is used this phase for captain hide.
- [ ] Apply via MCP; confirm values with `select enum_range(null::play_status)`.

---

### Task 2: Migration `0008` — personal-scope columns, draft columns, RLS rewrite, grants

**File:** `supabase/migrations/0008_personal_playbooks.sql`.

- [ ] **`play` columns:**
```sql
alter table play add column owner_id uuid references auth.users(id) on delete set null;
alter table play alter column team_id drop not null;                       -- null => personal
alter table play drop constraint play_team_id_slug_key;
create unique index play_team_slug_uq     on play(team_id, slug) where team_id is not null;
create unique index play_personal_slug_uq on play(owner_id, slug) where team_id is null;
alter table play add constraint play_scope_ck check (team_id is not null or owner_id is not null);
```
- [ ] **Rewrite `play` RLS.** Drop the Phase-1 `"phase1 public read published plays"` policy and replace with the full set (helpers from `0005` live in `private`):
```sql
-- SELECT (permissive, OR'd)
create policy "public read published team plays" on play for select to anon, authenticated
  using (team_id is not null and status = 'published');
create policy "owners read personal plays" on play for select to authenticated
  using (team_id is null and owner_id = auth.uid());
create policy "authors read own team submissions" on play for select to authenticated
  using (team_id is not null and created_by = auth.uid());
create policy "captains read team plays" on play for select to authenticated
  using (team_id is not null and private.is_captain(team_id));
create policy "admin reads all plays" on play for select to authenticated using (private.is_admin());
-- INSERT
create policy "insert personal play" on play for insert to authenticated
  with check (team_id is null and owner_id = auth.uid());
create policy "captains insert team play" on play for insert to authenticated
  with check (team_id is not null and (private.is_captain(team_id) or private.is_admin()));
-- (player submit -> pending: added in Phase 5)
-- UPDATE
create policy "update personal play" on play for update to authenticated
  using (team_id is null and owner_id = auth.uid()) with check (team_id is null and owner_id = auth.uid());
create policy "captains update team play" on play for update to authenticated
  using (team_id is not null and (private.is_captain(team_id) or private.is_admin()))
  with check (team_id is not null and (private.is_captain(team_id) or private.is_admin()));
-- DELETE
create policy "delete personal play" on play for delete to authenticated
  using (team_id is null and owner_id = auth.uid());
create policy "captains delete team play" on play for delete to authenticated
  using (team_id is not null and (private.is_captain(team_id) or private.is_admin()));
```
> **Security note:** the old public-read policy allowed `status='published'` regardless of team. With personal plays now carrying `team_id IS NULL`, the new public policy adds `team_id is not null` so a personal play can never be world-readable. Double-check no personal row is ever `anon`-visible during verification.
- [ ] **`draft` columns + RLS + grants** (RLS enabled in `0001`, no policies):
```sql
alter table draft alter column team_id drop not null;                      -- personal WIP has no team
alter table draft drop constraint draft_team_id_user_id_name_key;
create unique index draft_user_name_uq on draft(user_id, name);
create policy "owners manage drafts" on draft for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```
- [ ] **Grants** (RLS still gates rows):
```sql
grant select, insert, update, delete on play to authenticated;   -- anon keeps SELECT (public read)
grant select, insert, update, delete on draft to authenticated;
grant all on play, draft to service_role;
```
- [ ] Apply via MCP; run `get_advisors` (security). **Critical manual RLS check** (Task 6) that anon cannot read personal plays.

---

### Task 3: Repository + server actions

**Files:** extend `src/lib/playsRepo.ts`; new `src/app/designer/actions.ts` (`'use server'`).

- [ ] **Repo reads** (RLS-enforced, server components): `getPersonalPlays()` (mine, `team_id is null`), `getPersonalPlayBySlug(slug)`, `getManageableTeams()` (id+name where admin or captain), `getTeamPlaysForManage(teamId)` (all statuses for captains). Keep existing public `getPublishedPlays`/`getPlayBySlug`.
- [ ] **Authoring actions** (each: `getUser()`, build flat `Play` via `buildPlay` from `lib/playDesignerConvert`, re-check role, RLS enforces):
  - `publishPersonalPlay(designerState)` → upsert `play {owner_id: uid, team_id: null, slug, …, status:'published', data: flatSteps}` on conflict `(owner_id, slug)`.
  - `publishTeamPlay(teamId, designerState)` → captain/admin only; upsert on `(team_id, slug)`, `created_by: uid`, `status:'published'`.
  - `deletePersonalPlay(slug)`, `deleteTeamPlay(teamId, slug)`, `hideTeamPlay`/`unhideTeamPlay(teamId, slug)` (status `hidden`↔`published`).
  - `importTeamPlayToPersonal(teamPlaySlug)` → copy a published team play into my personal playbook (snapshot). Slug-collision: auto-suffix `-2`, `-3`, … if I already own that slug.
- [ ] **Draft actions** (replace the file routes): `listDrafts()`, `saveDraft(name, designerJson)` (upsert `(user_id, name)`), `loadDraft(name)`, `deleteDraft(name)`. `draft.data` = nested Designer tree.
- [ ] `revalidatePath` on `/my-playbook` and `/team` where relevant.

---

### Task 4: Retire dev-only routes + rewire the Designer

- [ ] **Delete** `src/app/api/designer/{publish,save}/route.ts`, `src/app/api/designer/drafts/route.ts`, `drafts/[name]/route.ts`, and `src/app/api/plays/[playId]/narrative/route.ts`. Update `src/app/api/CLAUDE.md` (this dir may become empty — note authoring moved to server actions).
- [ ] **Inline narrative edit** (Viewer `NarrativePanel`, was dev-only): remove the dev-only button + its fetch. (Narrative is edited by re-publishing from the Designer; a proper owner/captain narrative action is **deferred**, noted in the spec.)
- [ ] **Designer page split.** `src/app/designer/page.tsx` is `'use client'`. Add a server wrapper that fetches `getCurrentProfile()` + `getManageableTeams()` and renders the existing client Designer with `{ user, manageableTeams }` props (mirrors the Viewer's server/client split). Move the current client body to `DesignerApp.tsx` if needed.
- [ ] **Rewire callbacks** in the Designer from `fetch('/api/designer/*')` to the new server actions (`handleSave`/`handleLoadDraft`/list/delete → draft actions; `handlePublish` → publish dialog, below).
- [ ] **Publish dialog:** destination choice — *Save to my playbook* (always, if signed in) and, when `manageableTeams` is non-empty, *Publish to `<team>`* per team. If signed out, the Save/Publish controls show **"Sign in to save"** (reuse the browser client's `signInWithOAuth`, redirect back to `/designer`). Preserve the existing name/category/set inputs.

---

### Task 5: My Playbook UI + navigation + personal-play viewing

**Files:** `src/app/my-playbook/page.tsx` (server) + small client bits; a personal-play viewer route.
- [ ] **`/my-playbook`** (gated: signed-in): lists my personal plays (name/category/set) with **Open in Designer** (loads that play into the Designer for editing), **Delete** (confirm), and **View**. Also an **Import from team** control listing published team plays I can copy into my playbook.
- [ ] **Personal-play viewing.** Personal slugs can collide with team slugs, so don't reuse `/plays/[slug]` (that's the public team viewer). Add `src/app/my-playbook/[slug]/page.tsx` that `getPersonalPlayBySlug` (owner-only via RLS) and renders the existing `PlayViewer` client component. `notFound()` if null.
- [ ] **Open-in-Designer:** load a personal play into the Designer via `playToDesignerSteps` (existing) — Designer reads `?play=<slug>&scope=personal` (or similar), fetches server-side in the wrapper, seeds initial state.
- [ ] **Nav:** in `AuthButton` (signed-in) add **My Playbook** and **Designer** links (keep them signed-in-only; `/designer` stays open by URL but the link appears only when signed in). "Manage team" link already exists for captains/admin.

---

### Task 6: Build + manual verification (multi-account)

- [ ] `npx tsc --noEmit`; `npm run build` (confirm the deleted API routes are gone from the route list; `/my-playbook` + `/my-playbook/[slug]` present).
- [ ] **Anonymous:** `/designer` opens; can create/edit; Save/Publish → "Sign in to save"; Viewer + public plays still work.
- [ ] **Player (non-captain):** sign in → Designer → Save to my playbook → appears in `/my-playbook`; open/edit/re-save; View renders; Delete works. **No** "Publish to team" option. Import a team play → copy lands in my playbook (slug auto-suffixed if needed).
- [ ] **Captain/admin:** "Publish to `<team>`" appears; publishing shows the play in the public Viewer (team, published); hide → disappears from public browse but visible to captain; delete works.
- [ ] **RLS isolation (critical):** signed out, a personal play's `/my-playbook/<slug>` 404s and it never appears in public browse; a player cannot read/edit another user's personal play or edit a team play; verify with a second account + a direct `execute_sql` as anon (should return 0 personal rows).
- [ ] **Drafts:** save named draft → list → load → delete, all persist in the `draft` table (survive a reload; work in prod).
- [ ] `get_advisors` (security) clean. **Commit** (gated on user go-ahead).

---

## Self-Review Notes
- **Public read tightened** to `team_id is not null and status='published'` — the one must-not-regress security change (personal plays must never be anon-visible).
- **No `service_role`** — every action runs as the user under RLS and re-checks role; parallels Phases 2–3.
- **`.ts` catalog is now purely a seed** (retired write path). Editing seeded content long-term = edit in the app; the committed files stay as history/first-run seed.
- **Deferred:** player submit→approve + captain approval queue (Phase 5); a proper in-place narrative-edit action (removed dev-only button this phase); progress sync (Phase 6); multi-team switcher / dynamic categories (Phase 7).
- **Big phase** — consider reviewing/merging as two PRs if it gets unwieldy: (4a) schema + personal publish + My Playbook + retire routes; (4b) captain team publish/hide + import + DB drafts. Default is one PR; split only if review benefits.

---

## Execution notes (2026-07-16)

Built on branch `feat/personal-playbooks-phase-4`. Shipped as **one PR** (full scope: personal + captain-direct team publish + import + DB drafts).

- **Migrations applied:** `0007_play_status_values` (add `pending`/`hidden`/`denied`), `0008_personal_playbooks` (play `owner_id` + nullable `team_id` + partial unique indexes + scope check; full RLS rewrite; draft RLS + nullable team_id + `(user_id,name)` key; grants).
- **Foundation:** `playsRepo` gained `getPersonalPlays`/`getPersonalPlayBySlug`/`getManageableTeams`; new `src/app/designer/actions.ts` (publish personal/team, delete, import, draft CRUD). **Upsert gotcha:** supabase-js can't target a *partial* unique index, so publish/draft use explicit select-then-insert/update. No `service_role` in app code.
- **Designer** split into a server `page.tsx` (reads `?play&scope`, fetches profile + manageable teams + initial play) + `DesignerApp.tsx` client; fetches → server actions; publish gained a destination selector (My playbook / each managed team); signed-out shows "Sign in to save". `onPublish` is now `(name, destination)`.
- **My Playbook** (`/my-playbook`) + owner-only `/my-playbook/[slug]` viewer; the viewer picker gained an optional `basePath` (`'/plays'` default, `'/my-playbook'` for personal) threaded PlayViewer→Sidebar→PlayPicker/PickerDrawer.
- **Retired:** all four `/api/designer/*` routes + `/api/plays/[playId]/narrative` (+ its dev-only inline editor); `api/CLAUDE.md` rewritten. `.ts` catalog is now purely the seed.
- **Verified:** `tsc` clean; production build OK (route list shows no `/api/*`, plus `/my-playbook`, `/my-playbook/[slug]`, server-rendered `/designer`). **RLS proven via role-simulated SQL:** a personal play is visible to its owner (1) but not to anon (0) or a non-owner (0); anon still sees the 7 public team plays. Dev-server smoke: home/play/designer 200, `/my-playbook` 307 signed-out, retired publish route 404.
- **Remaining (manual, human-only):** in-app multi-account run — sign in → Designer → save to My Playbook → View/Edit/Delete; captain "Publish to team" shows in the public Viewer + hide; import a team play; named drafts persist. Then commit gate.
