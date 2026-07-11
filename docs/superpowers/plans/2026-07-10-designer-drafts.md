# Play Designer Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the play designer auto-transfer the disc when a step is duplicated after a throw, silently autosave in-progress work to localStorage, and support named drafts (save-by-overwrite, list, load, delete) backed by files in `designer-output/`.

**Architecture:** Three independent slices of the same feature, each touching a distinct layer: (1) a pure data-transform inside `useDesignerState.ts`'s `addStep`; (2) two `useEffect`s plus a `loadDraft` function in the same hook, following the codebase's existing SSR-safe hydration pattern; (3) a small `sanitizeDraftName` helper plus one modified and two new Next.js route handlers under `src/app/api/designer/`; (4) toolbar UI and page-level fetch/handler wiring that consumes the new routes and hook function.

**Tech Stack:** Next.js 16 App Router (async route params: `{ params }: { params: Promise<{ name: string }> }`), React 19, TypeScript, `fs/promises`, browser `localStorage`. No automated tests — this is a hobby project with an explicit no-testing policy; verification is `npx tsc --noEmit` plus manual exercise of the running app.

## Global Constraints

- No automated tests of any kind. Verify each task with `npx tsc --noEmit` (must show zero errors) and by manually exercising the feature in the browser.
- Draft filenames are sanitized with `name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()` — this exact pattern must be shared (not re-implemented ad hoc) between the save route and the new drafts routes.
- Saving a draft **overwrites** the existing file by name (no timestamp suffix) — `designer-output/<safeName>.json`.
- The localStorage autosave key is exactly `mousetrap-designer-autosave` and stores `{ category, set, steps }`.
- The autosave-restore effect must run once on mount and set a `hasHydrated` flag afterward (success or failure); the autosave-write effect must not run until `hasHydrated` is `true`, to avoid clobbering a just-restored draft with stale default state on the first render pass.
- No draft renaming, no folders/categories for drafts, no versioning/undo beyond git. Do not build these.
- `designer-output/` is git-ignored already (`.gitignore` has the entry) — no change needed there.

---

### Task 1: Disc auto-transfer on "+ Add Step"

**Files:**
- Modify: `src/hooks/useDesignerState.ts:131-138` (the `addStep` function)

**Interfaces:**
- Consumes: existing `freshStepFrom(step: DesignerStep): DesignerStep`, `currentStep: DesignerStep` (closure variable already in scope), `DesignerStep.throw?: ThrowArc` (`{ from: Position; to: Position }`), `PlayerState.hasDisc?: boolean`, `PlayerState.isDefense?: boolean`.
- Produces: no new exports — `addStep`'s existing signature and its place in the hook's returned object (`src/hooks/useDesignerState.ts:218`) are unchanged. Later tasks do not depend on anything new from this task.

- [ ] **Step 1: Update `addStep` to transfer the disc when duplicating a step that has a throw**

Open `src/hooks/useDesignerState.ts` and replace the current `addStep` function:

```ts
  function addStep() {
    const duplicated = freshStepFrom(currentStep)
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const newIndex = sequence.length
    setRootSteps((prev) => replaceSequenceAtPath(prev, currentPath, (seq) => [...seq, duplicated]))
    setCurrentPath([...currentPath.slice(0, -1), newIndex])
    setSelectedIndex(null)
  }
```

with:

```ts
  function addStep() {
    let duplicated = freshStepFrom(currentStep)
    if (currentStep.throw) {
      const { from, to } = currentStep.throw
      duplicated = {
        ...duplicated,
        players: duplicated.players.map((p) => {
          if (p.isDefense) return p
          if (p.id === to) return { ...p, hasDisc: true }
          if (p.id === from) return { ...p, hasDisc: false }
          return p
        }),
      }
    }
    const sequence = getSequenceAtPath(rootSteps, currentPath)
    const newIndex = sequence.length
    setRootSteps((prev) => replaceSequenceAtPath(prev, currentPath, (seq) => [...seq, duplicated]))
    setCurrentPath([...currentPath.slice(0, -1), newIndex])
    setSelectedIndex(null)
  }
```

This only changes behavior when `currentStep.throw` is set. `freshStepFrom` already drops `pathPreviews`/`throw`/`branches` for the new step (see its existing definition at line 18), so no other field needs touching.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. In Position mode, set a disc holder on one offense player.
2. Switch to Mark Throw mode, select the disc holder, then click a different offense player to mark the throw.
3. Click "+ Add Step".
4. Switch to Position mode on the new step and confirm the disc indicator (highlighted token) is now on the receiver, not the original thrower.
5. Also confirm the *original* step still shows the thrower as the disc holder (the throw step itself is untouched — only the newly duplicated step changes).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDesignerState.ts
git commit -m "feat(designer): auto-transfer disc to receiver when adding a step after a throw"
```

---

### Task 2: LocalStorage autosave, restore, and `loadDraft`

**Files:**
- Modify: `src/hooks/useDesignerState.ts` (add `useEffect` import, `AUTOSAVE_KEY` constant, `hasHydrated` state, two effects, `loadDraft` function, and add `loadDraft` to the returned object)

**Interfaces:**
- Consumes: `Play['category']`, `Play['set']`, `DesignerStep[]` (all already imported/used in this file); existing `category`/`set`/`setCategory`/`setSet`/`rootSteps`/`setRootSteps`/`setCurrentPath`/`setSelectedIndex` state and setters already defined in the hook.
- Produces: `loadDraft(data: { category?: Play['category']; set?: Play['set']; steps: DesignerStep[] }): void`, added to the hook's returned object alongside the existing functions. Task 4's `page.tsx` calls `designer.loadDraft(...)` with this exact signature.

- [ ] **Step 1: Add the `useEffect` import**

In `src/hooks/useDesignerState.ts`, change the first line:

```ts
import { useState } from 'react'
```

to:

```ts
import { useEffect, useState } from 'react'
```

- [ ] **Step 2: Add the autosave key constant**

Below the existing `OFFENSE_ORDER` constant (`src/hooks/useDesignerState.ts:6`), add:

```ts
const AUTOSAVE_KEY = 'mousetrap-designer-autosave'
```

- [ ] **Step 3: Add `hasHydrated` state**

In the `useDesignerState` function body, immediately after the existing `const [set, setSet] = useState<Play['set']>('ho-stack')` line, add:

```ts
  const [hasHydrated, setHasHydrated] = useState(false)
```

- [ ] **Step 4: Add the restore-on-mount and autosave-on-change effects**

Immediately after the `const currentStep = getStepAtPath(rootSteps, currentPath)` line (and before `function updateCurrentStep(...)`), add:

```ts
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as { category?: Play['category']; set?: Play['set']; steps?: DesignerStep[] }
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setRootSteps(data.steps)
          if (data.category) setCategory(data.category)
          if (data.set) setSet(data.set)
          setCurrentPath([0])
        }
      }
    } catch {
      // malformed or absent autosave data — ignore and keep defaults
    }
    setHasHydrated(true)
  }, [])

  // Guarded by hasHydrated so this effect's first run (which fires on mount
  // regardless of whether the restore effect above has applied its update yet)
  // doesn't immediately overwrite a just-restored draft with default state.
  useEffect(() => {
    if (!hasHydrated) return
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ category, set, steps: rootSteps }))
  }, [hasHydrated, rootSteps, category, set])
```

- [ ] **Step 5: Add `loadDraft`**

Add this function after `removeBranch` (`src/hooks/useDesignerState.ts:184-194`, right before the `return` statement):

```ts
  function loadDraft(data: { category?: Play['category']; set?: Play['set']; steps: DesignerStep[] }) {
    setRootSteps(data.steps)
    if (data.category) setCategory(data.category)
    if (data.set) setSet(data.set)
    setCurrentPath([0])
    setSelectedIndex(null)
  }
```

- [ ] **Step 6: Add `loadDraft` to the returned object**

In the `return { ... }` block at the end of `useDesignerState`, add `loadDraft,` after `removeBranch,`:

```ts
    addBranch,
    addAnotherBranch,
    removeBranch,
    loadDraft,
  }
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. Move a player token, add a step, change the category dropdown to something other than the default.
2. Refresh the page. Confirm the moved token, the extra step, and the category selection are all still there (restored from localStorage).
3. Open devtools Application/Storage tab, confirm `localStorage['mousetrap-designer-autosave']` contains `{"category":...,"set":...,"steps":[...]}` matching what's on screen.
4. Clear that localStorage key and refresh again — confirm the designer falls back to the default single-step layout with no console errors.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useDesignerState.ts
git commit -m "feat(designer): autosave in-progress work to localStorage and add loadDraft"
```

---

### Task 3: Draft API routes

**Files:**
- Create: `src/lib/designerDrafts.ts`
- Modify: `src/app/api/designer/save/route.ts`
- Create: `src/app/api/designer/drafts/route.ts`
- Create: `src/app/api/designer/drafts/[name]/route.ts`

**Interfaces:**
- Consumes: nothing from prior tasks (this task is server-only and independent of the hook changes).
- Produces: `sanitizeDraftName(name: string): string` (exported from `src/lib/designerDrafts.ts`, used by both routes below). `GET /api/designer/drafts` → `{ drafts: string[] }`. `GET /api/designer/drafts/[name]` → the draft's raw JSON body (`{ category, set, steps }`) or `{ error: string }` with status 404. `DELETE /api/designer/drafts/[name]` → `{ ok: true }` or `{ error: string }` with status 404. Task 4's `page.tsx` calls all three of these routes by exact path and shape.

- [ ] **Step 1: Extract the filename-sanitization helper**

Create `src/lib/designerDrafts.ts`:

```ts
export function sanitizeDraftName(name: string): string {
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}
```

- [ ] **Step 2: Update the save route to overwrite by name and use the shared helper**

Replace the full contents of `src/app/api/designer/save/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { sanitizeDraftName } from '@/lib/designerDrafts'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, category, set, steps } = body as { name?: unknown; category?: unknown; set?: unknown; steps?: unknown }

  if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps)) {
    return NextResponse.json({ error: 'Missing name or steps' }, { status: 400 })
  }

  const safeName = sanitizeDraftName(name)
  const dir = path.join(process.cwd(), 'designer-output')
  const filename = `${safeName}.json`

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), JSON.stringify({ category, set, steps }, null, 2))

  return NextResponse.json({ path: `designer-output/${filename}` })
}
```

The only behavioral change from before: the timestamp is gone from `filename`, so saving under a name already used overwrites that file instead of creating a new one.

- [ ] **Step 3: Create the drafts list route**

Create `src/app/api/designer/drafts/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  const dir = path.join(process.cwd(), 'designer-output')
  try {
    const files = await readdir(dir)
    const drafts = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort()
    return NextResponse.json({ drafts })
  } catch {
    return NextResponse.json({ drafts: [] })
  }
}
```

The `try/catch` means a missing `designer-output/` directory (e.g. a fresh checkout before any save has ever happened) returns an empty list instead of an error.

- [ ] **Step 4: Create the single-draft load/delete route**

Create `src/app/api/designer/drafts/[name]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import path from 'path'
import { sanitizeDraftName } from '@/lib/designerDrafts'

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const safeName = sanitizeDraftName(name)
  const filePath = path.join(process.cwd(), 'designer-output', `${safeName}.json`)

  try {
    const raw = await readFile(filePath, 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const safeName = sanitizeDraftName(name)
  const filePath = path.join(process.cwd(), 'designer-output', `${safeName}.json`)

  try {
    await unlink(filePath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
}
```

Sanitizing `name` the same way the save route sanitizes its filename means a request like `GET /api/designer/drafts/../../etc/passwd` collapses to a harmless dotless string — there is no path-traversal surface.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` in one terminal.

```bash
# Save a draft
curl -s -X POST http://localhost:3000/api/designer/save \
  -H 'Content-Type: application/json' \
  -d '{"name":"test-draft","category":"offense","set":"ho-stack","steps":[{"players":[],"pathPreviews":[]}]}'
# Expected: {"path":"designer-output/test-draft.json"}

# List drafts
curl -s http://localhost:3000/api/designer/drafts
# Expected: {"drafts":["test-draft"]}

# Load it
curl -s http://localhost:3000/api/designer/drafts/test-draft
# Expected: {"category":"offense","set":"ho-stack","steps":[{"players":[],"pathPreviews":[]}]}

# Save again under the same name with different content, confirm overwrite not duplication
curl -s -X POST http://localhost:3000/api/designer/save \
  -H 'Content-Type: application/json' \
  -d '{"name":"test-draft","category":"defense","set":"vert-stack","steps":[{"players":[],"pathPreviews":[]}]}'
curl -s http://localhost:3000/api/designer/drafts
# Expected: still {"drafts":["test-draft"]} (not two entries)
curl -s http://localhost:3000/api/designer/drafts/test-draft
# Expected: category is now "defense"

# Delete it
curl -s -X DELETE http://localhost:3000/api/designer/drafts/test-draft
# Expected: {"ok":true}
curl -s http://localhost:3000/api/designer/drafts
# Expected: {"drafts":[]}

# Load/delete a nonexistent draft
curl -s http://localhost:3000/api/designer/drafts/nonexistent
# Expected: {"error":"Draft not found"} with 404 (add -i to curl to see the status line)
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/designerDrafts.ts src/app/api/designer/save/route.ts src/app/api/designer/drafts/route.ts "src/app/api/designer/drafts/[name]/route.ts"
git commit -m "feat(designer): overwrite-by-name save and add draft list/load/delete API routes"
```

---

### Task 4: Toolbar Load Draft UI and page wiring

**Files:**
- Modify: `src/components/designer/DesignerToolbar.tsx`
- Modify: `src/app/designer/page.tsx`

**Interfaces:**
- Consumes: `designer.loadDraft` (from Task 2), `GET /api/designer/drafts`, `GET /api/designer/drafts/[name]`, `DELETE /api/designer/drafts/[name]` (from Task 3).
- Produces: no further consumers — this is the last task.

- [ ] **Step 1: Add new props to `DesignerToolbarProps`**

In `src/components/designer/DesignerToolbar.tsx`, replace:

```ts
type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
}
```

with:

```ts
type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
  draftNames: string[]
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
}
```

- [ ] **Step 2: Destructure the new props**

Replace:

```ts
export function DesignerToolbar({ designer, onSave }: DesignerToolbarProps) {
```

with:

```ts
export function DesignerToolbar({ designer, onSave, draftNames, onLoadDraft, onDeleteDraft }: DesignerToolbarProps) {
```

- [ ] **Step 3: Render the Load Draft list above the Save form**

Replace:

```tsx
      <SaveForm onSave={onSave} />
    </div>
  )
}
```

with:

```tsx
      {draftNames.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Load Draft</span>
          {draftNames.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <button
                onClick={() => onLoadDraft(name)}
                className="flex-1 text-left px-2 py-1 rounded-md border border-border text-text text-sm"
              >
                {name}
              </button>
              <button
                onClick={() => onDeleteDraft(name)}
                className="text-xs text-text-muted hover:text-danger-border"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <SaveForm onSave={onSave} />
    </div>
  )
}
```

- [ ] **Step 4: Wire draft state and handlers into the page**

Replace the full contents of `src/app/designer/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'
import type { DesignerStep } from '@/types/designer'
import type { Play } from '@/types/play'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])

  async function refreshDrafts() {
    try {
      const res = await fetch('/api/designer/drafts')
      const data = await res.json()
      setDraftNames(Array.isArray(data.drafts) ? data.drafts : [])
    } catch {
      setDraftNames([])
    }
  }

  useEffect(() => {
    refreshDrafts()
  }, [])

  async function handleSave(name: string) {
    setSaveStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: designer.category, set: designer.set, steps: designer.steps }),
      })
      const data = await res.json()
      setSaveStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
      if (res.ok) refreshDrafts()
    } catch {
      setSaveStatus('Error: failed to save')
    }
  }

  async function handleLoadDraft(name: string) {
    if (!window.confirm(`Load "${name}"? This will replace your current in-progress work.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`)
      const data = await res.json()
      if (res.ok) {
        designer.loadDraft(data as { category?: Play['category']; set?: Play['set']; steps: DesignerStep[] })
      }
    } catch {
      // ignore load errors — the toolbar list only ever shows names the server reported
    }
  }

  async function handleDeleteDraft(name: string) {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    await fetch(`/api/designer/drafts/${name}`, { method: 'DELETE' })
    refreshDrafts()
  }

  return (
    <main className="flex flex-col md:flex-row h-screen bg-bg">
      <div className="w-full md:w-[65%] h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <DesignerCanvas designer={designer} />
        </div>
      </div>
      <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 overflow-y-auto">
        <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Play Designer</h1>
        <DesignerToolbar
          designer={designer}
          onSave={handleSave}
          draftNames={draftNames}
          onLoadDraft={handleLoadDraft}
          onDeleteDraft={handleDeleteDraft}
        />
        {saveStatus && <p className="text-sm text-text-muted">{saveStatus}</p>}
      </aside>
    </main>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. Build a short play, save it as `manual-test` via the Save form. Confirm the "Load Draft" list appears showing `manual-test`.
2. Move a token, then click Load next to `manual-test` — confirm the browser's native confirm dialog appears; accept it, and confirm the canvas resets to the saved state (token back in its saved position).
3. Change something and save again under the same name `manual-test` — confirm the list still shows exactly one `manual-test` entry (no duplicate), and reloading it reflects the newest save.
4. Click Delete next to `manual-test`, accept the confirm dialog, confirm it disappears from the list and the "Load Draft" section itself disappears if it was the only draft.
5. Refresh the whole page and confirm the draft list still loads correctly on mount (fetched fresh from the server, independent of the localStorage autosave from Task 2).

- [ ] **Step 7: Commit**

```bash
git add src/components/designer/DesignerToolbar.tsx src/app/designer/page.tsx
git commit -m "feat(designer): add Load Draft list UI with load/delete actions"
```

---

## Self-Review Notes

- **Spec coverage:** Disc auto-transfer (Task 1) ✅. LocalStorage autosave with `hasHydrated`-guarded restore/write effects (Task 2) ✅. Overwrite-by-name save, list/load/delete routes with shared sanitization (Task 3) ✅. Toolbar Load Draft section with per-entry Load/Delete and page-level fetch/handler wiring, confirms before destructive load/delete (Task 4) ✅. Non-goals (renaming, folders, versioning) — correctly not built.
- **Placeholder scan:** No TBD/TODO markers; every step has complete, exact code.
- **Type consistency:** `loadDraft`'s parameter shape (`{ category?, set?, steps }`) is defined once in Task 2 and consumed identically in Task 4's `handleLoadDraft`. `sanitizeDraftName` is defined once in Task 3 and imported by both routes that need it. `DesignerStep`/`Play['category']`/`Play['set']` types are reused verbatim from their existing definitions in `src/types/designer.ts` and `src/types/play.ts` — no new type is introduced that duplicates an existing one.
