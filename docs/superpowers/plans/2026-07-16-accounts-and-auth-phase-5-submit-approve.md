# Accounts & Auth — Phase 5: Submit → Approve Workflow — Implementation Plan

> Builds on the 2026-07-15 design spec (submit = **snapshot copy**; captains approve/deny). Phase 4 already added `pending`/`hidden`/`denied` to `play_status` and the SELECT policies that let a submitter see their own submissions and captains see all their team's plays.

**Goal:** A regular member can **submit a play to a team for approval** (from the Designer or from My Playbook); a **captain/admin** sees a **pending queue** and **approves** (→ published) or **denies** (→ denied, with a note). The submitter can see the **status** of their submissions. Viewer stays public (only `published` team plays show).

## Model (from the design)
- **Submit = snapshot copy.** Submitting inserts an independent team-play row `status='pending'`, `created_by = submitter`; the personal copy (if any) is untouched.
- **Slug collision** in the target team → reject with a clear message ("a play named X already exists in this team"); the user renames. (No silent `-2` suffix in a shared playbook.)
- **Approve** = `pending → published`; **Deny** = `pending → denied` + `review_note`. Both stamp `reviewed_by`/`reviewed_at`.

## Migration `0010_submissions`
- Add review columns: `reviewed_by uuid references auth.users(id)`, `reviewed_at timestamptz`, `review_note text`.
- Add the member-submission INSERT policy:
```sql
create policy "members submit pending team play" on play for insert to authenticated
  with check (team_id is not null and status = 'pending'
              and created_by = auth.uid() and private.is_member(team_id));
```
(Captains' approve/deny UPDATE is already covered by "captains update team play"; the submitter/captain SELECTs already exist.)

## Server actions (`src/app/designer/actions.ts` + `src/app/team/actions.ts`)
- `submitDesignToTeam(teamId, session)` — build the flat play, reject on slug collision in the team, insert `{team_id, slug, …, status:'pending', created_by: uid, data}`. Member-only (RLS + code check).
- `submitPersonalPlayToTeam(teamId, personalSlug)` — snapshot an existing personal play into a pending team row (same collision rule).
- `approveSubmission(teamId, slug)` / `denySubmission(teamId, slug, note)` — captain/admin (reuse `requireManage`); set status + review fields.

## Repo reads
- `getMySubmissions()` — the caller's team plays with `status in (pending, denied)` (their `created_by`), with team name + review_note, for the My Playbook status list.
- `getPendingSubmissions(teamId)` — `status='pending'` plays for the captain queue.

## UI
- **Designer:** when the active playbook is a team the caller is a **member of but cannot publish to**, the primary action becomes **"Submit for approval"** (→ `submitDesignToTeam`) instead of a disabled "Add to playbook". Captains/admin keep direct publish.
- **My Playbook:** a **"Submit to team"** control per personal play (pick a team) → `submitPersonalPlayToTeam`; and a **"Submissions"** section showing each submission's status (Pending / Published / Denied + note).
- **/team:** a **"Pending approvals"** section per managed team — each pending play with **Approve** / **Deny** (+ optional note) and a link to preview/open it.

## Verify
- tsc + build. RLS role-sim: a member can insert only a `pending` play for a team they're on; cannot insert `published`; a non-member cannot submit; a captain can update pending→published/denied.
- Manual (two accounts): player submits from Designer and from My Playbook → appears in the captain's queue and in the player's Submissions as Pending → captain approves (shows in public viewer) / denies (player sees Denied + note). Slug collision rejected with a clear message.
