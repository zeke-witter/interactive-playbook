# src/data/ — Content

Static content: the plays themselves and the glossary. No logic beyond the small index helpers.

> Roster names are no longer static here. Each team owns its player names in the
> `roster_name` table (division-aware, split cutter/handler); `useRoster` samples
> that team's pool at render (`getRosterPoolForPlay` → `PlayViewer` → `useRoster`),
> falling back to the raw tokens (`C1`…`H3`) when a play's team has none.

## `plays/`
- **`*.ts`** — one file per **seed** play, each exporting a single `Play` const (e.g. `flood.ts` → `export const flood`). These are the first-run seed loaded into the DB by `scripts/seedPlays.ts`; the **live catalog is the `play` table**, not these files. Plain TypeScript following the flat step model + branch-contiguity convention (see `src/types/CLAUDE.md`) — hand-editable, but edits only take effect on a (re-)seed.
- **`index.ts`** — the seed registry. Imports every seed play into `ALL_PLAYS` and exposes the pure browse helpers `categoriesWithPlays()`, `setsInCategory(category)`, `playsInSet(category, set)` (the Viewer feeds these DB-fetched `Play[]`, mirrored in `src/lib/playsRepo.ts`). Adding/removing a seed play means editing this index by hand — the Designer's publish writes to the DB, not here.

To add a play in the running app, use the Designer → Publish/Submit path (writes to Supabase under RLS). Editing narrative is done by re-publishing from the Designer. The files here matter only when seeding a fresh database.

## `glossary.ts`
`GLOSSARY: Record<string, GlossaryEntry>` — ultimate-frisbee jargon (`break side`, `under`, `reset`, …). Each entry has a `definition` and optional `zone` (normalized rect). The Viewer's `NarrativeWithTooltips` underlines these terms in narrative and, on hover, shows the definition and highlights the zone on the field. Add a term here to make it tooltip-enabled everywhere.

