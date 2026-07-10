# Embedded Nested Play Picker + Narrative Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the design in `docs/superpowers/specs/2026-07-09-embedded-play-picker-design.md` — larger narrative text, a `/` → default-play redirect, and a nested category → set → play picker embedded in the sidebar replacing the old standalone homepage.

**Architecture:** Pure addition + one route simplification. `ALL_PLAYS` gains three small pure grouping helpers; a new `PlayPicker` client component owns its own breadcrumb-level state and calls `router.push` to switch plays; `Sidebar` gains one more child between the narrative/quiz block and the controls block.

**Tech Stack:** No new dependencies. `next/navigation`'s `redirect` and `useRouter` (both already used elsewhere in the app).

## Global Constraints

- No automated tests (project-wide policy) — verify manually via the dev server.
- The pop-in animation fix and inter-step travel are already done and out of scope here — don't touch `PlayerToken.tsx`/`PlayerTokens.tsx`.
- Categories/sets with zero plays must not appear in the picker (no empty-state UI) — achieved naturally by deriving picker data from `ALL_PLAYS` rather than an exhaustive enum.
- The picker's default view on open must be the *current* play's own category/set/plays list, not the top-level category list.

---

### Task 1: Narrative text sizing

**Files:**
- Modify: `src/components/sidebar/NarrativePanel.tsx`
- Modify: `src/components/sidebar/NarrativeWithTooltips.tsx`

- [ ] **Step 1: Bump both paragraph elements from `text-base` to `text-lg`**

In `NarrativePanel.tsx`, change:
```tsx
<p className="text-base leading-relaxed text-text-muted">
```
to:
```tsx
<p className="text-lg leading-relaxed text-text-muted">
```

In `NarrativeWithTooltips.tsx`, change:
```tsx
<p className="text-base leading-relaxed text-text">
```
to:
```tsx
<p className="text-lg leading-relaxed text-text">
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood` — confirm the narrative paragraph is visibly larger than before.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/NarrativePanel.tsx src/components/sidebar/NarrativeWithTooltips.tsx
git commit -m "feat: increase narrative text size"
```

---

### Task 2: Play-grouping data helpers

**Files:**
- Modify: `src/data/plays/index.ts`

**Interfaces:**
- Produces: `DEFAULT_PLAY_ID: string`, `categoriesWithPlays(): Play['category'][]`, `setsInCategory(category): Play['set'][]`, `playsInSet(category, set): Play[]` — consumed by Task 3 (redirect) and Task 4 (`PlayPicker`).

- [ ] **Step 1: Add the default-play constant and grouping helpers**

```typescript
// src/data/plays/index.ts
import type { Play } from '@/types/play'
import { flood } from './flood'
import { hoStackCenter } from './ho-stack-center'
import { reverse } from './reverse'

export const ALL_PLAYS: Play[] = [flood, hoStackCenter, reverse]

export const PLAYS: Record<string, Play> = Object.fromEntries(ALL_PLAYS.map((play) => [play.id, play]))

export const DEFAULT_PLAY_ID = 'flood'

export function categoriesWithPlays(): Play['category'][] {
  return Array.from(new Set(ALL_PLAYS.map((p) => p.category)))
}

export function setsInCategory(category: Play['category']): Play['set'][] {
  return Array.from(new Set(ALL_PLAYS.filter((p) => p.category === category).map((p) => p.set)))
}

export function playsInSet(category: Play['category'], set: Play['set']): Play[] {
  return ALL_PLAYS.filter((p) => p.category === category && p.set === set)
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/data/plays/index.ts
git commit -m "feat: add play-grouping helpers and DEFAULT_PLAY_ID"
```

---

### Task 3: Route redirect

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the play-list homepage with a redirect**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'
import { DEFAULT_PLAY_ID } from '@/data/plays'

export default function HomePage() {
  redirect(`/plays/${DEFAULT_PLAY_ID}`)
}
```

This removes the `'use client'` directive, the `ALL_PLAYS`/`useProgress` imports, and the list JSX entirely — the play list and progress readout move into the picker in Task 4.

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000/` — confirm it redirects to `http://localhost:3000/plays/flood`.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redirect / to the default play instead of a standalone homepage"
```

---

### Task 4: PlayPicker component

**Files:**
- Create: `src/components/sidebar/PlayPicker.tsx`

**Interfaces:**
- Consumes: `categoriesWithPlays`, `setsInCategory`, `playsInSet` (Task 2), `useProgress` (existing hook), `Play` type.
- Produces: `<PlayPicker currentPlay />` — consumed by `Sidebar` in Task 5.

- [ ] **Step 1: Write PlayPicker**

```tsx
// src/components/sidebar/PlayPicker.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesWithPlays, setsInCategory, playsInSet } from '@/data/plays'
import { useProgress } from '@/hooks/useProgress'
import type { Play } from '@/types/play'

type PickerLevel =
  | { view: 'categories' }
  | { view: 'sets'; category: Play['category'] }
  | { view: 'plays'; category: Play['category']; set: Play['set'] }

const CATEGORY_LABELS: Record<Play['category'], string> = {
  offense: 'Offense',
  defense: 'Defense',
}

const SET_LABELS: Record<Play['set'], string> = {
  'ho-stack': 'Ho Stack',
  'vert-stack': 'Vert Stack',
  'zone-o': 'Zone Offense',
  'zone-d': 'Zone Defense',
  'person-d': 'Person Defense',
  endzone: 'Endzone',
  'pull-play': 'Pull Play',
}

const ROW_CLASS = 'text-left rounded-md border px-3 py-2 border-border bg-surface text-text hover:bg-surface-raised transition-colors'

export function PlayPicker({ currentPlay }: { currentPlay: Play }) {
  const router = useRouter()
  const { completedCount } = useProgress()
  const [level, setLevel] = useState<PickerLevel>({
    view: 'plays',
    category: currentPlay.category,
    set: currentPlay.set,
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs text-text-muted uppercase tracking-wide">
        <button onClick={() => setLevel({ view: 'categories' })} className="hover:text-accent">
          Plays
        </button>
        {level.view !== 'categories' && (
          <>
            <span>›</span>
            <button onClick={() => setLevel({ view: 'sets', category: level.category })} className="hover:text-accent">
              {CATEGORY_LABELS[level.category]}
            </button>
          </>
        )}
        {level.view === 'plays' && (
          <>
            <span>›</span>
            <span className="text-text">{SET_LABELS[level.set]}</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {level.view === 'categories' &&
          categoriesWithPlays().map((category) => (
            <button key={category} onClick={() => setLevel({ view: 'sets', category })} className={ROW_CLASS}>
              {CATEGORY_LABELS[category]}
            </button>
          ))}

        {level.view === 'sets' &&
          setsInCategory(level.category).map((set) => (
            <button key={set} onClick={() => setLevel({ view: 'plays', category: level.category, set })} className={ROW_CLASS}>
              {SET_LABELS[set]}
            </button>
          ))}

        {level.view === 'plays' &&
          playsInSet(level.category, level.set).map((play) => (
            <button
              key={play.id}
              onClick={() => router.push(`/plays/${play.id}`)}
              className={
                play.id === currentPlay.id
                  ? 'text-left rounded-md border px-3 py-2 border-accent bg-surface-raised text-accent'
                  : ROW_CLASS
              }
            >
              <div>{play.name}</div>
              <div className="text-xs text-text-muted">{completedCount(play.id)}/7 positions learned</div>
            </button>
          ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Mounting is deferred to Task 5's verification — this task just needs a clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/PlayPicker.tsx
git commit -m "feat: add nested category/set/play picker component"
```

---

### Task 5: Wire PlayPicker into Sidebar

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Render PlayPicker between the narrative/quiz block and the controls block**

```tsx
// src/components/sidebar/Sidebar.tsx
import { PlayPicker } from './PlayPicker'
// ...existing imports stay

// inside the returned JSX, add right after the {quiz && <QuizPanel .../>} line and before the
// {step.branches?.length ? ... : ...} block:
      <PlayPicker currentPlay={play} />
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `/plays/flood` — confirm the picker renders between the narrative and the Prev/Next controls, already showing "Plays › Offense › Pull Play" with Flood highlighted and its progress count. Click "Pull Play" to go up a level (shows Ho Stack + Pull Play as sets... actually shows the sets under Offense), click "Offense" to go up further (shows Offense/Defense categories), then drill back down and select Ho Stack — confirm it navigates to `/plays/ho-stack-center` and the picker there opens already on "Plays › Offense › Ho Stack" with Ho Stack highlighted.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "feat: wire PlayPicker into the sidebar"
```

---

## Self-Review

**Spec coverage:** narrative sizing (Task 1), route redirect + `DEFAULT_PLAY_ID` (Tasks 2-3), picker data/component/wiring (Tasks 2, 4, 5) all covered.

**Placeholder scan:** none — every step has complete code.

**Type consistency:** `PlayPicker`'s `currentPlay: Play` prop matches what `Sidebar` already receives as `play: Play`; `categoriesWithPlays`/`setsInCategory`/`playsInSet` return types match their usage in `PlayPicker` exactly.
