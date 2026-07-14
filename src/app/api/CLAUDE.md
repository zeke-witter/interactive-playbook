# src/app/api/ — Route handlers (dev-only writes)

These endpoints exist so the Designer and Viewer can mutate **source files on the local disk**. That model has hard rules:

- **Publish and narrative-edit are gated on `process.env.NODE_ENV === 'development'`** and return 403 otherwise. Vercel's production filesystem is read-only, and any write that did succeed would vanish on the next deploy. To change published content: run `npm run dev`, publish/edit locally, then **commit** the generated files.
- All filename/id inputs are run through `sanitizeSlug` before hitting the filesystem.
- Source-file edits use **`ts-morph`** (AST), not string concatenation, so generated code stays well-formed.

## Endpoints

### `designer/publish/route.ts` — `POST` (dev only)
The Designer → catalog step. Converts the nested Designer tree to a flat `Play` via `buildPlay` (`lib/playDesignerConvert`), then:
- Writes `src/data/plays/<id>.ts` (a `JSON.stringify`'d `Play` assigned to a camelCase export).
- If the play is new, registers it in `src/data/plays/index.ts` (adds the import + `ALL_PLAYS` element via ts-morph).
- `id` comes from the request when overwriting an existing play (`publishedPlayId`), else from `sanitizeSlug(name)`. Returns `{ id, isNew }`.

### `designer/save/route.ts` — `POST`
Saves a named **draft** (the raw Designer JSON: `{category, set, steps}`) to `designer-output/<slug>.json`. Not gated to dev in code, but only useful locally. Drafts are the nested Designer shape, not the flat `Play` shape.

### `designer/drafts/route.ts` — `GET`
Lists draft names (the `.json` files in `designer-output/`, sorted). Returns `{ drafts: [] }` if the dir doesn't exist.

### `designer/drafts/[name]/route.ts` — `GET` / `DELETE`
Read or delete a single draft by name.

### `plays/[playId]/narrative/route.ts` — `PATCH` (dev only)
Inline narrative editing from the Viewer. Finds the step object by `id` in the play's `.ts` file (ts-morph), then sets/adds the `narrative[position]` property to the new text and saves. This is why the Viewer's `NarrativePanel` edit button is dev-only.

## When extending
Keep new write endpoints dev-gated and slug-sanitized, prefer ts-morph for `.ts` edits, and remember the two on-disk shapes differ: **drafts = nested Designer JSON**, **published plays = flat `Play` TypeScript**.
