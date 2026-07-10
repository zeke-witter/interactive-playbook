# Dark Athletic HUD Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the app's UI chrome into the "Dark Athletic HUD" look approved in `docs/superpowers/specs/2026-07-09-dark-hud-visual-restyle-design.md` — dark surfaces, lime accent, Oswald headings, rounded corners — with the SVG field visuals completely untouched.

**Architecture:** Pure styling change. New design tokens land once in `globals.css`'s Tailwind v4 `@theme` block and Oswald loads once via `next/font/google` in `layout.tsx`; every other task just swaps existing Tailwind utility classes (`border-gray-200` → `border-border`, etc.) for the new tokens, file by file.

**Tech Stack:** No new dependencies. `next/font/google` (already used for Geist) adds Oswald the same way.

## Global Constraints

- No automated tests (project-wide policy) — verify manually via the dev server, screenshots, and `npx tsc --noEmit`.
- Zero changes to `FieldBackground.tsx`, `PlayerToken.tsx`, `ForceIndicator.tsx`, `PathPreviews.tsx`, `ThrowArc.tsx`, `DiscMarker.tsx`, `StallCounter.tsx` — the field's SVG content is explicitly out of scope.
- No behavior/logic changes anywhere — className/style edits only.
- Token names and values are fixed by the spec (see table there) — use them verbatim, don't invent new ad-hoc colors.

---

### Task 1: Design tokens + Oswald font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace globals.css with the dark token set**

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #0b0d11;
  --foreground: #f4f4f5;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-display: var(--font-oswald);

  --color-bg: #0b0d11;
  --color-surface: #15181f;
  --color-surface-raised: #1c2029;
  --color-border: #262b35;
  --color-text: #f4f4f5;
  --color-text-muted: #9aa0ac;
  --color-accent: #a3e635;
  --color-accent-hover: #bef264;
  --color-accent-foreground: #0b0d11;
  --color-success-bg: #132615;
  --color-success-border: #4ade80;
  --color-danger-bg: #2a1518;
  --color-danger-border: #f87171;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

This removes the old `@media (prefers-color-scheme: dark)` block — the app is deliberately always-dark now, not system-preference-dependent. It also fixes a pre-existing bug: the old `body { font-family: Arial, Helvetica, sans-serif; }` hardcoded past the Geist font that was already being loaded, so Geist was never actually applied anywhere. This makes `--font-sans` (Geist) the real default.

- [ ] **Step 2: Load Oswald and fix the leftover scaffold metadata**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Mousetrap Plays",
  description: "Interactive playbook for the Mousetrap ultimate frisbee team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

`title`/`description` were still the literal `create-next-app` defaults from Task 1 of the original build — fixed here since this file is already open for the font change.

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000` — confirm the page background is now near-black and text is off-white (even with no other components restyled yet, since `body` sets the base colors globally).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add Dark Athletic HUD design tokens and Oswald font"
```

---

### Task 2: Homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Restyle the play list**

```tsx
// src/app/page.tsx
'use client'
import Link from 'next/link'
import { ALL_PLAYS } from '@/data/plays'
import { useProgress } from '@/hooks/useProgress'

export default function HomePage() {
  const { completedCount } = useProgress()

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide mb-6">Mousetrap Plays</h1>
      <ul className="flex flex-col gap-3">
        {ALL_PLAYS.map((play) => (
          <li key={play.id}>
            <Link href={`/plays/${play.id}`} className="block rounded-xl border border-border bg-surface p-4 hover:bg-surface-raised transition-colors">
              <div className="font-display font-medium uppercase tracking-wide">{play.name}</div>
              <div className="text-sm text-accent uppercase tracking-wide">{play.category} · {play.set}</div>
              <div className="text-sm text-text-muted">{completedCount(play.id)}/7 positions learned</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Reload `http://localhost:3000` — confirm dark cards with lime category/set labels, Oswald uppercase headings, rounded corners, and a visible hover state on each row.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: restyle homepage with Dark Athletic HUD chrome"
```

---

### Task 3: Play viewer page frame + Sidebar wrapper

**Files:**
- Modify: `src/app/plays/[playId]/page.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Frame the field, darken the page**

```tsx
// src/app/plays/[playId]/page.tsx — only the returned JSX changes, all hooks/logic stay identical
  return (
    <main className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-[65%] aspect-[5/6] md:aspect-auto md:h-full p-4">
        <div className="w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <FieldCanvas step={step} selectedPosition={selectedPosition} playCategory={play.category} highlightZone={highlightZone} />
        </div>
      </div>
      <Sidebar
        play={play}
        step={step}
        stepIndex={stepIndex}
        selectedPosition={selectedPosition}
        onPositionChange={setSelectedPosition}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={prev}
        onNext={next}
        onChooseBranch={(branch) => goToStep(branch.nextStepId)}
        quiz={quiz}
        quizPassed={quizPassed}
        onQuizAnswered={(correct) => correct && setQuizPassed(true)}
        onHighlightZone={setHighlightZone}
      />
    </main>
  )
```

The new wrapper `<div>` around `<FieldCanvas>` is the "field's outer frame" from the spec — `FieldCanvas`'s own `<svg className="w-full h-full">` is untouched and still fills its container exactly as before; only the container gained padding, a rounded border, and a surface background.

- [ ] **Step 2: Restyle the Sidebar wrapper and its inline Prev button**

```tsx
// src/components/sidebar/Sidebar.tsx
import type { Play, PlayStep, Position, Quiz, PlayBranch } from '@/types/play'
import { PositionSelector } from './PositionSelector'
import { PlayHeader } from './PlayHeader'
import { NarrativePanel } from './NarrativePanel'
import { StepControls } from './StepControls'
import { QuizPanel } from './QuizPanel'
import { BranchChoice } from './BranchChoice'

type SidebarProps = {
  play: Play
  step: PlayStep
  stepIndex: number
  selectedPosition: Position
  onPositionChange: (p: Position) => void
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  onChooseBranch: (branch: PlayBranch) => void
  quiz: Quiz | undefined
  quizPassed: boolean
  onQuizAnswered: (correct: boolean) => void
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
}

export function Sidebar({
  play, step, stepIndex, selectedPosition, onPositionChange,
  isFirst, isLast, onPrev, onNext, onChooseBranch, quiz, quizPassed, onQuizAnswered, onHighlightZone,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
      <PlayHeader name={play.name} stepLabel={step.label} stepIndex={stepIndex} totalSteps={play.steps.length} />
      <PositionSelector value={selectedPosition} onChange={onPositionChange} />
      <NarrativePanel text={step.narrative[selectedPosition]} onHighlightZone={onHighlightZone} />
      {quiz && <QuizPanel quiz={quiz} onAnswered={onQuizAnswered} />}
      {step.branches?.length ? (
        <div className="flex flex-col gap-2">
          <button onClick={onPrev} disabled={isFirst} className="self-start px-3 py-1 rounded-md border border-border bg-surface text-text hover:bg-surface-raised disabled:opacity-30">
            ◀ Prev
          </button>
          <BranchChoice branches={step.branches} onChoose={onChooseBranch} />
        </div>
      ) : (
        <StepControls
          stepIndex={stepIndex}
          totalSteps={play.steps.length}
          isFirst={isFirst}
          isLast={isLast}
          nextDisabled={!!quiz && !quizPassed}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </aside>
  )
}
```

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood` — confirm the field sits inside a rounded, bordered dark frame with padding around it, the sidebar's divider border is the new dark-theme border color (not the old light gray), and the standalone Prev button next to a branch choice (visit `/plays/reverse`, step 3) matches the new dark button style.

- [ ] **Step 4: Commit**

```bash
git add "src/app/plays/[playId]/page.tsx" src/components/sidebar/Sidebar.tsx
git commit -m "feat: frame the field and restyle the sidebar wrapper"
```

---

### Task 4: Sidebar sub-components

**Files:**
- Modify: `src/components/sidebar/PlayHeader.tsx`
- Modify: `src/components/sidebar/PositionSelector.tsx`
- Modify: `src/components/sidebar/NarrativePanel.tsx`
- Modify: `src/components/sidebar/NarrativeWithTooltips.tsx`
- Modify: `src/components/sidebar/StepControls.tsx`
- Modify: `src/components/sidebar/BranchChoice.tsx`

- [ ] **Step 1: PlayHeader**

```tsx
// src/components/sidebar/PlayHeader.tsx
export function PlayHeader({ name, stepLabel, stepIndex, totalSteps }: { name: string; stepLabel: string; stepIndex: number; totalSteps: number }) {
  return (
    <div>
      <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Mousetrap Plays</h1>
      <h2 className="text-sm text-text-muted">{name} — {stepLabel} ({stepIndex + 1} of {totalSteps})</h2>
    </div>
  )
}
```

- [ ] **Step 2: PositionSelector**

```tsx
// src/components/sidebar/PositionSelector.tsx
'use client'
import type { Position } from '@/types/play'

const ALL_POSITIONS: Position[] = ['H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'C4']

type PositionSelectorProps = {
  value: Position
  onChange: (position: Position) => void
}

export function PositionSelector({ value, onChange }: PositionSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-text">
      <span>🎯 You are:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Position)}
        className="rounded-md border border-border bg-surface text-text px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {ALL_POSITIONS.map((pos) => (
          <option key={pos} value={pos}>{pos}</option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 3: NarrativePanel fallback text**

```tsx
// src/components/sidebar/NarrativePanel.tsx
import { NarrativeWithTooltips } from './NarrativeWithTooltips'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
}

export function NarrativePanel({ text, onHighlightZone }: NarrativePanelProps) {
  if (!text) {
    return (
      <p className="text-base leading-relaxed text-text-muted">
        You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
      </p>
    )
  }

  return <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} />
}
```

- [ ] **Step 4: NarrativeWithTooltips — text color and tooltip popover**

```tsx
// src/components/sidebar/NarrativeWithTooltips.tsx
'use client'
import { useState } from 'react'
import { GLOSSARY } from '@/data/glossary'

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)
const TERM_PATTERN = new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')

type NarrativeWithTooltipsProps = {
  text: string
  onHighlightZone: (zone: GlossaryEntryZone | null) => void
}

type GlossaryEntryZone = NonNullable<(typeof GLOSSARY)[string]['zone']>

export function NarrativeWithTooltips({ text, onHighlightZone }: NarrativeWithTooltipsProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)
  const parts = text.split(TERM_PATTERN)

  return (
    <p className="text-base leading-relaxed text-text">
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

The tooltip popover moves from a hardcoded `bg-gray-900` to the token-based `bg-surface-raised border border-border` — reads correctly against the new page background and stays consistent with every other popover/card in the app.

- [ ] **Step 5: StepControls**

```tsx
// src/components/sidebar/StepControls.tsx
type StepControlsProps = {
  stepIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  nextDisabled?: boolean
  onPrev: () => void
  onNext: () => void
}

export function StepControls({ stepIndex, totalSteps, isFirst, isLast, nextDisabled, onPrev, onNext }: StepControlsProps) {
  return (
    <div className="flex flex-col gap-2 sticky bottom-0 bg-bg md:static md:bg-transparent pt-2">
      <div className="flex justify-between">
        <button onClick={onPrev} disabled={isFirst} className="px-3 py-1 rounded-md border border-border bg-surface text-text hover:bg-surface-raised disabled:opacity-30">
          ◀ Prev
        </button>
        <button onClick={onNext} disabled={isLast || nextDisabled} className="px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground font-medium hover:bg-accent-hover disabled:opacity-30 disabled:bg-surface disabled:border-border disabled:text-text-muted">
          Next ▶
        </button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === stepIndex ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>
    </div>
  )
}
```

The mobile sticky bar's background changes from the old hardcoded `bg-white` (which would have looked broken — a white bar on a dark page) to `bg-bg`. Next becomes the filled accent button (primary action); Prev stays outlined/secondary. Both get explicit `disabled:` overrides so a disabled Next doesn't look like a clickable lime button.

- [ ] **Step 6: BranchChoice**

```tsx
// src/components/sidebar/BranchChoice.tsx
import type { PlayBranch } from '@/types/play'

export function BranchChoice({ branches, onChoose }: { branches: PlayBranch[]; onChoose: (branch: PlayBranch) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">What happens next?</p>
      {branches.map((branch) => (
        <button
          key={branch.id}
          onClick={() => onChoose(branch)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-left text-text hover:bg-surface-raised hover:border-accent transition-colors"
        >
          {branch.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood`: confirm the position dropdown, narrative text, and step controls all match the dark theme with no leftover light-mode grays. Open `/plays/reverse` step 3 to see `BranchChoice` styled. Hover a glossary term (e.g. "rail") in the narrative to confirm the tooltip popover reads correctly against the dark background.

- [ ] **Step 8: Commit**

```bash
git add src/components/sidebar/PlayHeader.tsx src/components/sidebar/PositionSelector.tsx src/components/sidebar/NarrativePanel.tsx src/components/sidebar/NarrativeWithTooltips.tsx src/components/sidebar/StepControls.tsx src/components/sidebar/BranchChoice.tsx
git commit -m "feat: restyle sidebar sub-components with Dark Athletic HUD tokens"
```

---

### Task 5: QuizPanel

**Files:**
- Modify: `src/components/sidebar/QuizPanel.tsx`

- [ ] **Step 1: Restyle with dark surface + success/danger tokens**

```tsx
// src/components/sidebar/QuizPanel.tsx
'use client'
import { useState } from 'react'
import type { Quiz } from '@/types/play'

type QuizPanelProps = {
  quiz: Quiz
  onAnswered: (correct: boolean) => void
}

export function QuizPanel({ quiz, onAnswered }: QuizPanelProps) {
  const [selected, setSelected] = useState<number | null>(null)

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    onAnswered(index === quiz.correctIndex)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2">
      <p className="font-medium text-text">{quiz.question}</p>
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
            {option}
          </button>
        )
      })}
      {selected !== null && <p className="text-sm text-text-muted">{quiz.explanation}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood`, select position C1, advance to step 3 — confirm the quiz panel is dark-surfaced, the correct answer highlights with the new green tokens and the wrong one (if picked) with the new red tokens, and all text remains readable.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/QuizPanel.tsx
git commit -m "feat: restyle QuizPanel with dark surface and success/danger tokens"
```

---

## Self-Review

**Spec coverage:** every file listed in the design spec's "Scope — Files Restyled" section has a task above; every file in "Explicitly Unchanged" has zero tasks touching it.

**Placeholder scan:** no TBD/TODO; every step has complete, copy-pasteable code.

**Type consistency:** `Sidebar`'s prop list, `StepControls`' `nextDisabled`, `NarrativeWithTooltips`' `GlossaryEntryZone`, and `QuizPanel`'s `Quiz` type are unchanged from the current codebase — this plan only touches `className` strings and two small text/font additions (Oswald, metadata), never signatures or logic.
