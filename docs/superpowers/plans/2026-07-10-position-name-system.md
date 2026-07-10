# Position Name System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the design in `docs/superpowers/specs/2026-07-10-position-name-system-design.md` — a randomized per-play-load roster of real names substituted everywhere position codes currently appear, with generic labels for the non-focus team.

**Architecture:** A pure display-layer feature. Play data, types, and routing are untouched. A `useRoster()` hook generates one random roster per play-page mount; a shared `substituteNames()` utility and a fixed generic-defender-label lookup are consumed by every component that currently renders a position code as visible text.

**Tech Stack:** No new dependencies.

## Global Constraints

- No automated tests (project-wide policy) — verify manually via the dev server.
- No changes to `PlayStep`/`Play` types, play data files, or routing.
- Handlers are always 2 MMP + 1 FMP; the cutter split (2 MMP + 2 FMP, or 1 MMP + 3 FMP) is what actually swings the overall 4:3 / 3:4 ratio.
- Generic defender labels (`D1`-`D7`) are a fixed lookup, not randomized.
- A fresh roster is drawn on every play-page mount — no persistence across plays or reloads.

---

### Task 1: Name bank, substitution utility, generic defender labels

**Files:**
- Create: `src/data/names.ts`
- Create: `src/lib/names.ts`

**Interfaces:**
- Produces: `MMP_CUTTER_NAMES`, `FMP_CUTTER_NAMES`, `MMP_HANDLER_NAMES`, `FMP_HANDLER_NAMES` (string arrays); `GENERIC_DEFENDER_LABELS: Record<Position, string>`; `substituteNames(text: string, roster: Record<Position, string>): string` — consumed by every later task.

- [ ] **Step 1: Write the name bank**

```typescript
// src/data/names.ts
export const MMP_CUTTER_NAMES = ['Kwast', 'Pizzo', 'BP', 'Alex', 'Tyler', 'Gabe', 'Diva', 'Zork', 'Spencer']
export const FMP_CUTTER_NAMES = ['Cameo', 'Elfie', 'Marv', 'Abi', 'Izzie', 'Olivia', 'Kaden', 'Veiga', 'Emily', 'Mary', 'Nicole']
export const MMP_HANDLER_NAMES = ['Zeke', 'TJ', 'Kevin', 'Zach', 'Erik', 'Dylan', 'Matthew']
export const FMP_HANDLER_NAMES = ['Catherine', 'Lily', 'Rani']
```

- [ ] **Step 2: Write the substitution utility and generic defender label map**

```typescript
// src/lib/names.ts
import type { Position } from '@/types/play'

export const GENERIC_DEFENDER_LABELS: Record<Position, string> = {
  C1: 'D1',
  C2: 'D2',
  C3: 'D3',
  C4: 'D4',
  H1: 'D5',
  H2: 'D6',
  H3: 'D7',
}

const POSITION_PATTERN = /\b(C[1-4]|H[1-3])\b/g

export function substituteNames(text: string, roster: Record<Position, string>): string {
  return text.replace(POSITION_PATTERN, (match) => roster[match as Position] ?? match)
}
```

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/data/names.ts src/lib/names.ts
git commit -m "feat: add name bank and position-name substitution utility"
```

---

### Task 2: useRoster hook

**Files:**
- Create: `src/hooks/useRoster.ts`

**Interfaces:**
- Consumes: name bank arrays from `@/data/names`, `Position` type.
- Produces: `useRoster(): Record<Position, string>` — consumed by the play page in Task 3.

- [ ] **Step 1: Write useRoster**

```typescript
// src/hooks/useRoster.ts
'use client'
import { useState } from 'react'
import { MMP_CUTTER_NAMES, FMP_CUTTER_NAMES, MMP_HANDLER_NAMES, FMP_HANDLER_NAMES } from '@/data/names'
import type { Position } from '@/types/play'

function pickUnique(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateRoster(): Record<Position, string> {
  const fourThreeRatio = Math.random() < 0.5
  const mmpCutterCount = fourThreeRatio ? 2 : 1
  const fmpCutterCount = fourThreeRatio ? 2 : 3

  const cutterNames = [
    ...pickUnique(MMP_CUTTER_NAMES, mmpCutterCount),
    ...pickUnique(FMP_CUTTER_NAMES, fmpCutterCount),
  ].sort(() => Math.random() - 0.5)

  const handlerNames = [
    ...pickUnique(MMP_HANDLER_NAMES, 2),
    ...pickUnique(FMP_HANDLER_NAMES, 1),
  ].sort(() => Math.random() - 0.5)

  return {
    C1: cutterNames[0],
    C2: cutterNames[1],
    C3: cutterNames[2],
    C4: cutterNames[3],
    H1: handlerNames[0],
    H2: handlerNames[1],
    H3: handlerNames[2],
  }
}

export function useRoster(): Record<Position, string> {
  const [roster] = useState<Record<Position, string>>(() => generateRoster())
  return roster
}
```

`useState`'s lazy initializer is used deliberately (not `useMemo`) — it's the only React primitive that guarantees the random draw happens exactly once per mount.

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRoster.ts
git commit -m "feat: add useRoster hook for per-play-load name assignment"
```

---

### Task 3: Field token labeling

**Files:**
- Modify: `src/components/field/PlayerToken.tsx`
- Modify: `src/components/field/PlayerTokens.tsx`
- Modify: `src/components/field/FieldCanvas.tsx`
- Modify: `src/app/plays/[playId]/page.tsx`

**Interfaces:**
- Consumes: `GENERIC_DEFENDER_LABELS` (Task 1), `useRoster` (Task 2).
- Produces: `PlayerToken` gains a `label: string` prop replacing its internal `{player.id}` render; `PlayerTokens`/`FieldCanvas` gain a `roster` prop.

- [ ] **Step 1: PlayerToken renders a passed-in label**

Change the `<text>` element's child from `{player.id}` to `{label}`, and add `label: string` to `PlayerTokenProps`.

- [ ] **Step 2: PlayerTokens computes each label per the labeling rule**

```tsx
// src/components/field/PlayerTokens.tsx
import { PlayerToken } from './PlayerToken'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import type { PlayerState, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  roster: Record<Position, string>
}

export function PlayerTokens({ players, selectedPosition, playCategory, roster }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        const label = dimmed
          ? (player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id)
          : roster[player.id]

        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
            enterIndex={i}
            label={label}
          />
        )
      })}
    </g>
  )
}
```

- [ ] **Step 3: Thread `roster` through FieldCanvas**

Add `roster: Record<Position, string>` to `FieldCanvasProps`, pass it to `<PlayerTokens roster={roster} .../>`.

- [ ] **Step 4: Call useRoster in the play page and pass it down**

In `src/app/plays/[playId]/page.tsx`, add `const roster = useRoster()`, pass `roster={roster}` to `<FieldCanvas>`.

- [ ] **Step 5: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `/plays/flood` several times (hard refresh each time) — confirm: the offense tokens show real names that change between loads; the dimmed defender tokens show `D1`-`D7` consistently (same defender always shows the same D-number); reloading a few times confirms the cutter split is sometimes 2-and-2, sometimes 1-and-3 (check by cross-referencing which names came from which bank). Open `/plays/zone-d-2-3-2` and confirm defense tokens show names, offense tokens show plain `C1`-`C4`/`H1`-`H3` codes (not `D#`, since that play's category is `defense`).

- [ ] **Step 6: Commit**

```bash
git add src/components/field/PlayerToken.tsx src/components/field/PlayerTokens.tsx src/components/field/FieldCanvas.tsx "src/app/plays/[playId]/page.tsx"
git commit -m "feat: label field tokens with assigned roster names or generic defender labels"
```

---

### Task 4: Sidebar text substitution — header, selector, narrative

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/sidebar/PlayHeader.tsx`
- Modify: `src/components/sidebar/PositionSelector.tsx`
- Modify: `src/components/sidebar/NarrativePanel.tsx`
- Modify: `src/components/sidebar/NarrativeWithTooltips.tsx`

**Interfaces:**
- Consumes: `substituteNames` (Task 1), `roster` (from the play page, Task 3).
- Produces: `Sidebar` gains a `roster` prop threaded to its children.

- [ ] **Step 1: Thread roster through Sidebar**

Add `roster: Record<Position, string>` to `SidebarProps`, destructure it, pass to `PlayHeader`, `PositionSelector`, and `NarrativePanel` (added in the next steps). In `src/app/plays/[playId]/page.tsx`, pass `roster={roster}` to `<Sidebar>` (reusing the same `roster` from Task 3).

- [ ] **Step 2: PlayHeader substitutes the step label**

```tsx
// src/components/sidebar/PlayHeader.tsx
import { substituteNames } from '@/lib/names'
import type { Position } from '@/types/play'

export function PlayHeader({
  name, stepLabel, stepIndex, totalSteps, roster,
}: {
  name: string; stepLabel: string; stepIndex: number; totalSteps: number; roster: Record<Position, string>
}) {
  return (
    <div>
      <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Mousetrap Plays</h1>
      <h2 className="text-sm text-text-muted">{name} — {substituteNames(stepLabel, roster)} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
```

- [ ] **Step 3: PositionSelector shows names in the dropdown, keeps position codes as values**

```tsx
// src/components/sidebar/PositionSelector.tsx — only the <select> children change
{ALL_POSITIONS.map((pos) => (
  <option key={pos} value={pos}>{roster[pos]}</option>
))}
```

Add `roster: Record<Position, string>` to `PositionSelectorProps` and destructure it in the function signature.

- [ ] **Step 4: NarrativePanel and NarrativeWithTooltips substitute before glossary tokenization**

```tsx
// src/components/sidebar/NarrativePanel.tsx
import { NarrativeWithTooltips } from './NarrativeWithTooltips'
import type { Position } from '@/types/play'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
  roster: Record<Position, string>
}

export function NarrativePanel({ text, onHighlightZone, roster }: NarrativePanelProps) {
  if (!text) {
    return (
      <p className="text-lg leading-relaxed text-text-muted">
        You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
      </p>
    )
  }

  return <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} roster={roster} />
}
```

```tsx
// src/components/sidebar/NarrativeWithTooltips.tsx — add roster prop and substitute first
'use client'
import { useState } from 'react'
import { GLOSSARY } from '@/data/glossary'
import { substituteNames } from '@/lib/names'
import type { Position } from '@/types/play'

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)
const TERM_PATTERN = new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')

type NarrativeWithTooltipsProps = {
  text: string
  onHighlightZone: (zone: GlossaryEntryZone | null) => void
  roster: Record<Position, string>
}

type GlossaryEntryZone = NonNullable<(typeof GLOSSARY)[string]['zone']>

export function NarrativeWithTooltips({ text, onHighlightZone, roster }: NarrativeWithTooltipsProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const substitutedText = substituteNames(text, roster)
  const parts = substitutedText.split(TERM_PATTERN)

  return (
    <p className="text-lg leading-relaxed text-text">
      {parts.map((part, i) => {
        const entry = GLOSSARY[part.toLowerCase()]
        if (!entry) return <span key={i}>{part}</span>

        return (
          <span
            key={i}
            className="underline decoration-dotted decoration-accent cursor-help relative"
            onMouseEnter={() => {
              setOpenTerm(part)
              if (entry.zone) onHighlightZone(entry.zone)
            }}
            onMouseLeave={() => {
              setOpenTerm(null)
              onHighlightZone(null)
            }}
          >
            {part}
            {openTerm === part && (
              <span className="absolute left-0 top-full z-10 w-56 rounded-md border border-border bg-surface-raised text-text text-sm p-2 shadow-lg">
                {entry.definition}
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}
```

- [ ] **Step 5: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `/plays/flood` — confirm the step label next to the play name shows a name instead of a raw position code where applicable, the position dropdown lists names (not H1/C1/etc.), and the narrative paragraph has no leftover raw position codes for the focus team (e.g. "C2 and C3 clear" now reads with two real names). Confirm glossary term tooltips (e.g. hovering "rail") still work correctly on the substituted text.

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx src/components/sidebar/PlayHeader.tsx src/components/sidebar/PositionSelector.tsx src/components/sidebar/NarrativePanel.tsx src/components/sidebar/NarrativeWithTooltips.tsx "src/app/plays/[playId]/page.tsx"
git commit -m "feat: substitute roster names in step labels, position selector, and narrative text"
```

---

### Task 5: Quiz text substitution

**Files:**
- Modify: `src/components/sidebar/QuizPanel.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`

**Interfaces:**
- Consumes: `substituteNames` (Task 1), `roster` (Task 3/4).

- [ ] **Step 1: QuizPanel substitutes question, options, and explanation**

```tsx
// src/components/sidebar/QuizPanel.tsx
'use client'
import { useState } from 'react'
import { substituteNames } from '@/lib/names'
import type { Quiz, Position } from '@/types/play'

type QuizPanelProps = {
  quiz: Quiz
  onAnswered: (correct: boolean) => void
  roster: Record<Position, string>
}

export function QuizPanel({ quiz, onAnswered, roster }: QuizPanelProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    onAnswered(index === quiz.correctIndex)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2">
      <p className="font-medium text-text">{substituteNames(quiz.question, roster)}</p>
      {quiz.options.map((option, index) => {
        const isSelected = selected === index
        const isCorrect = index === quiz.correctIndex
        const showResult = selected !== null

        return (
          <button
            key={option}
            onClick={() => handleSelect(index)}
            disabled={selected !== null}
            className={`text-left rounded-md border px-3 py-2 text-text ${
              showResult && isCorrect ? 'border-success-border bg-success-bg' :
              showResult && isSelected ? 'border-danger-border bg-danger-bg' :
              'border-border bg-surface-raised'
            }`}
          >
            {substituteNames(option, roster)}
          </button>
        )
      })}
      {selected !== null && <p className="text-sm text-text-muted">{substituteNames(quiz.explanation, roster)}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Pass roster from Sidebar to QuizPanel**

In `Sidebar.tsx`, change `{quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} />}` to `{quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} roster={roster} />}`.

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood`, select the position with the quiz (C1 on step 3), confirm the question, all four options, and the explanation all show names instead of raw position codes (e.g. the correct-answer option "C2" now shows the assigned name).

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/QuizPanel.tsx src/components/sidebar/Sidebar.tsx
git commit -m "feat: substitute roster names in quiz question, options, and explanation"
```

---

## Self-Review

**Spec coverage:** every component listed in the design's "Component Changes" section has a task above.

**Placeholder scan:** none — every step has complete code.

**Type consistency:** `PlayerToken`'s new `label: string` prop, `PlayerTokens`/`FieldCanvas`/`Sidebar`/`PlayHeader`/`PositionSelector`/`NarrativePanel`/`NarrativeWithTooltips`/`QuizPanel`'s new `roster: Record<Position, string>` prop are named and typed identically everywhere they're threaded, matching `useRoster()`'s return type from Task 2.
