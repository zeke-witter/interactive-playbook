# Admin-Editable Formation Templates — Plan

**Goal:** Let the admin fix the per-set starting formations (the player layouts applied on New Play / set-switch in the Designer) from the live app, instead of hand-editing `src/lib/defaultFormations.ts`.

## Design
- **Overrides only.** The committed `DEFAULT_FORMATIONS` constant stays as the built-in default. A new global `formation` table stores only admin overrides; `getFormations()` returns a complete per-set map, falling back to the constant for any set without a row.
- **Global, admin-only.** Formations are app-wide base layouts (not per-team). `formation` is world-readable; writes are gated to `is_admin()` (RLS) and re-checked in the server action.
- **No retroactive change.** Editing a template only affects *future* New Play / set-switch; existing plays keep their stored positions.

## Pieces
- **Migration `0009_formations`**: `formation(set_id text pk, data jsonb, updated_by, updated_at)`; RLS (public read, admin write); grants. No seed (constant is the fallback).
- **`getFormations()`** (`playsRepo`): overrides ∪ `defaultFormationFor` for all `ALL_SETS`.
- **`saveFormation(setId, players)`** (`designer/actions.ts`): admin-checked upsert on `set_id`.
- **`useDesignerState(formations?)`**: `formationFor(set)` = override ?? constant; used by the initial step, `setSet`, and `newPlay`.
- **Designer wrapper** passes `getFormations()` in; **FileModal** shows an admin-only "Save current layout as {set} template" button → `handleSaveFormation` snapshots the current step's players for `designer.set`.

## Verify
- tsc + build. RLS role-sim: admin insert allowed, non-admin insert raises `42501`, reads public.
- Manual (admin): New Play → pick a set → arrange players → "Save … template"; new plays in that set start from the saved layout. Non-admin sees no button.
