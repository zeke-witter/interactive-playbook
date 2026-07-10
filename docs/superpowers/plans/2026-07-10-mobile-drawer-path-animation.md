# Mobile Drawer, Path-Following Animation, Endzone Visibility, Flood Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the design in `docs/superpowers/specs/2026-07-10-mobile-drawer-path-animation-design.md` — path-following token animation, a conditional attacking-endzone band, a Flood data correction for C4, and (mobile-only) relocated Prev/Next controls plus a drawer-based play picker.

**Architecture:** Five mostly-independent changes layered onto the existing component tree. No routing or type changes except one new optional field consumed by existing components.

**Tech Stack:** No new dependencies.

## Global Constraints

- No automated tests (project-wide policy) — verify manually via the dev server at both desktop and mobile viewport sizes.
- Desktop layout is unchanged — the controls-relocation and drawer changes are mobile-only (`md:hidden` / `hidden md:...`).
- The pop-in entrance animation (scale/opacity, no travel) must not be affected by path-following — gate path-following on the existing `entering` state.

---

### Task 1: Path-following token animation

**Files:**
- Modify: `src/components/field/PlayerTokens.tsx`
- Modify: `src/components/field/PlayerToken.tsx`
- Modify: `src/components/field/FieldCanvas.tsx`

- [ ] **Step 1: PlayerTokens computes each player's path points, if any**

```tsx
// src/components/field/PlayerTokens.tsx
import { PlayerToken } from './PlayerToken'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { toPixel } from '@/lib/field'
import type { PlayerState, PlayerPath, Position } from '@/types/play'

type PlayerTokensProps = {
  players: PlayerState[]
  selectedPosition: Position
  playCategory: 'offense' | 'defense'
  roster: Record<Position, string>
  pathPreviews: PlayerPath[]
}

export function PlayerTokens({ players, selectedPosition, playCategory, roster, pathPreviews }: PlayerTokensProps) {
  return (
    <g>
      {players.map((player, i) => {
        const dimmed = player.isDefense ? playCategory === 'offense' : playCategory === 'defense'
        const label = dimmed
          ? (player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id)
          : roster[player.id]
        const path = !player.isDefense ? pathPreviews.find((p) => p.playerId === player.id) : undefined
        const pathPoints = path?.points.map((pt) => toPixel(pt.x, pt.y))

        return (
          <PlayerToken
            key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
            player={player}
            isYou={!player.isDefense && player.id === selectedPosition}
            dimmed={dimmed}
            enterIndex={i}
            label={label}
            pathPoints={pathPoints}
          />
        )
      })}
    </g>
  )
}
```

- [ ] **Step 2: PlayerToken uses path points as animation keyframes when present**

```tsx
// src/components/field/PlayerToken.tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { toPixel } from '@/lib/field'
import type { PlayerState } from '@/types/play'

type PlayerTokenProps = {
  player: PlayerState
  isYou: boolean
  dimmed: boolean
  enterIndex: number
  label: string
  pathPoints?: { px: number; py: number }[]
}

export function PlayerToken({ player, isYou, dimmed, enterIndex, label, pathPoints }: PlayerTokenProps) {
  const { px, py } = toPixel(player.x, player.y)
  const fill = player.isDefense ? '#dc2626' : '#2563eb'
  const [entering, setEntering] = useState(true)
  const enterDelay = enterIndex * 0.035

  const xTarget = !entering && pathPoints ? pathPoints.map((p) => p.px) : px
  const yTarget = !entering && pathPoints ? pathPoints.map((p) => p.py) : py

  return (
    <motion.g
      initial={{ x: px, y: py, opacity: 0, scale: 0 }}
      animate={{
        x: xTarget,
        y: yTarget,
        opacity: dimmed ? 0.4 : 1,
        scale: entering ? [0, 1.35, 0.85, 1.05, 1] : 1,
      }}
      onAnimationComplete={() => setEntering(false)}
      transition={{
        default: { duration: 0.6, ease: 'easeInOut' },
        scale: entering
          ? { duration: 0.5, times: [0, 0.35, 0.6, 0.8, 1], delay: enterDelay }
          : { duration: 0.3 },
        opacity: { duration: 0.3, delay: entering ? enterDelay : 0 },
      }}
    >
      <circle r={3.2} fill={fill} />
      {isYou && <circle r={4.2} fill="none" stroke="white" strokeWidth={0.6} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </motion.g>
  )
}
```

- [ ] **Step 3: Pass step.pathPreviews through FieldCanvas**

In `FieldCanvas.tsx`, change `<PlayerTokens players={step.players} selectedPosition={selectedPosition} playCategory={playCategory} roster={roster} />` to add `pathPreviews={step.pathPreviews}`.

- [ ] **Step 4: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Open `/plays/flood`, advance to step 3 — confirm C1's token visibly travels up-and-then-curls-back (tracing the same route as the yellow/amber dashed path preview) rather than moving in a straight line. Confirm the entrance pop-in on fresh load is unaffected (no travel, just pop in place).

- [ ] **Step 5: Commit**

```bash
git add src/components/field/PlayerTokens.tsx src/components/field/PlayerToken.tsx src/components/field/FieldCanvas.tsx
git commit -m "feat: animate cuts along their dashed path preview instead of a direct tween"
```

---

### Task 2: Conditional attacking-endzone band

**Files:**
- Modify: `src/components/field/FieldBackground.tsx`
- Modify: `src/components/field/FieldCanvas.tsx`
- Modify: `src/app/plays/[playId]/page.tsx`

- [ ] **Step 1: FieldBackground accepts showAttackingEndzone**

```tsx
// src/components/field/FieldBackground.tsx
import { FIELD_WIDTH, FIELD_HEIGHT, ENDZONE_DEPTH } from '@/lib/field'

export function FieldBackground({ showAttackingEndzone }: { showAttackingEndzone: boolean }) {
  const fieldTop = ENDZONE_DEPTH
  const fieldBottom = FIELD_HEIGHT - ENDZONE_DEPTH

  return (
    <g>
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#2f7d3c" />
      {showAttackingEndzone && (
        <>
          <rect x={0} y={0} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
          <line x1={0} y1={fieldTop} x2={FIELD_WIDTH} y2={fieldTop} stroke="white" strokeWidth={0.5} />
        </>
      )}
      <rect x={0} y={fieldBottom} width={FIELD_WIDTH} height={ENDZONE_DEPTH} fill="#1f5c2a" />
      <line x1={0} y1={fieldBottom} x2={FIELD_WIDTH} y2={fieldBottom} stroke="white" strokeWidth={0.5} />
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="none" stroke="white" strokeWidth={0.5} />
      <text x={FIELD_WIDTH / 2} y={fieldBottom + ENDZONE_DEPTH / 2} fill="white" fontSize={4} textAnchor="middle" opacity={0.6}>
        ENDZONE
      </text>
    </g>
  )
}
```

- [ ] **Step 2: FieldCanvas computes it from a new playSet prop**

In `FieldCanvas.tsx`, add `playSet: Play['set']` to `FieldCanvasProps` (import `Play` alongside the existing `PlayStep, Position` import from `@/types/play`), destructure it, and change `<FieldBackground />` to `<FieldBackground showAttackingEndzone={playSet === 'endzone'} />`.

- [ ] **Step 3: Play page passes play.set**

In `src/app/plays/[playId]/page.tsx`, change the `<FieldCanvas .../>` call to add `playSet={play.set}`.

- [ ] **Step 4: Manual verification**

```bash
npx tsc --noEmit
```

Open `/plays/flood` — confirm no shaded band at the top of the field (just continuous green up to the edge), bottom endzone band unchanged. Open `/plays/endzone-baby-iso` — confirm the top band still renders there.

- [ ] **Step 5: Commit**

```bash
git add src/components/field/FieldBackground.tsx src/components/field/FieldCanvas.tsx "src/app/plays/[playId]/page.tsx"
git commit -m "feat: hide the attacking endzone band for non-endzone plays"
```

---

### Task 3: Flood data correction — C4 clears and cuts under for continuation

**Files:**
- Modify: `src/data/plays/flood.ts`

- [ ] **Step 1: Rewrite flood.ts with C4's active role**

```typescript
// src/data/plays/flood.ts
import type { Play } from '@/types/play'

export const flood: Play = {
  id: 'flood',
  name: 'Flood',
  category: 'offense',
  set: 'pull-play',
  description:
    "Post-pull play that isolates under space for C1, who looks for a quick continuation throw to C4. Not force-dependent; can be run from either side. Source: Mousetrap Playbook p.46 (diagram-verified).",
  steps: [
    {
      id: 'flood-1-setup',
      label: 'Setup — Receiving the Pull',
      force: 'none',
      players: [
        { id: 'H1', x: 0.486, y: 0.455, hasDisc: true },
        { id: 'H2', x: 0.127, y: 0.455 },
        { id: 'H3', x: 0.794, y: 0.487 },
        { id: 'C1', x: 0.095, y: 0.328 },
        { id: 'C2', x: 0.302, y: 0.328 },
        { id: 'C3', x: 0.556, y: 0.328 },
        { id: 'C4', x: 0.810, y: 0.328 },
        { id: 'H1', x: 0.486, y: 0.400, isDefense: true },
        { id: 'H2', x: 0.127, y: 0.400, isDefense: true },
        { id: 'H3', x: 0.794, y: 0.432, isDefense: true },
        { id: 'C1', x: 0.095, y: 0.273, isDefense: true },
        { id: 'C2', x: 0.302, y: 0.273, isDefense: true },
        { id: 'C3', x: 0.556, y: 0.273, isDefense: true },
        { id: 'C4', x: 0.810, y: 0.273, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "You've just secured the pull. C1, C2, C3, and C4 are spread in a row across the field, evenly spaced. Get ready to hit whoever clears open first.",
        H2: 'Set up as break-side handler support — stay wide and available for a reset if the flow stalls.',
        H3: "You're the open-side handler. Give H1 an easy reset option while the cutters go to work.",
        C1: "You're on the far side of the row. In a moment you'll cut upfield and curl back under for the first look.",
        C2: "You're next to C1 — you'll clear hard toward the corner to empty the middle.",
        C3: "You're in the row too — clear toward the corner alongside C2, stacking behind them.",
        C4: "You're on the near side of the row — you'll clear with C2 and C3, then cut back under to give C1 a continuation option downfield.",
      },
    },
    {
      id: 'flood-2-clear',
      label: 'C2, C3, and C4 Clear to the Corner',
      force: 'none',
      players: [
        { id: 'H1', x: 0.486, y: 0.455, hasDisc: true },
        { id: 'H2', x: 0.127, y: 0.455 },
        { id: 'H3', x: 0.794, y: 0.487 },
        { id: 'C1', x: 0.095, y: 0.328 },
        { id: 'C2', x: 0.09, y: 0.20 },
        { id: 'C3', x: 0.14, y: 0.16 },
        { id: 'C4', x: 0.20, y: 0.12 },
        { id: 'H1', x: 0.486, y: 0.400, isDefense: true },
        { id: 'H2', x: 0.127, y: 0.400, isDefense: true },
        { id: 'H3', x: 0.794, y: 0.432, isDefense: true },
        { id: 'C1', x: 0.095, y: 0.273, isDefense: true },
        { id: 'C2', x: 0.09, y: 0.145, isDefense: true },
        { id: 'C3', x: 0.14, y: 0.105, isDefense: true },
        { id: 'C4', x: 0.20, y: 0.065, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C2', points: [{ x: 0.302, y: 0.328 }, { x: 0.09, y: 0.20 }], type: 'clear' },
        { playerId: 'C3', points: [{ x: 0.556, y: 0.328 }, { x: 0.14, y: 0.16 }], type: 'clear' },
        { playerId: 'C4', points: [{ x: 0.810, y: 0.328 }, { x: 0.20, y: 0.12 }], type: 'clear' },
      ],
      narrative: {
        H1: "C2, C3, and C4 are clearing hard toward the corner, emptying the middle of the field for the first cut.",
        C1: 'Hold your position for a beat — let C2, C3, and C4 clear the space you\'re about to attack.',
        C2: "Clear hard toward the corner — stay out of C1's cutting lane.",
        C3: 'Same for you — clear tight alongside C2 so the middle is wide open.',
        C4: "Clear to the corner with C2 and C3 — you'll cut back under from here once C1's look develops.",
        H2: "Hold your spacing; watch for the first cut to develop.",
        H3: "Hold your spacing; watch for the first cut to develop.",
      },
    },
    {
      id: 'flood-3-under-cut',
      label: 'C1 Cuts Upfield and Curls Under',
      stallCount: 3,
      force: 'none',
      players: [
        { id: 'H1', x: 0.486, y: 0.455, hasDisc: true },
        { id: 'H2', x: 0.127, y: 0.455 },
        { id: 'H3', x: 0.794, y: 0.487 },
        { id: 'C1', x: 0.54, y: 0.28 },
        { id: 'C2', x: 0.09, y: 0.20 },
        { id: 'C3', x: 0.14, y: 0.16 },
        { id: 'C4', x: 0.20, y: 0.12 },
        { id: 'H1', x: 0.486, y: 0.400, isDefense: true },
        { id: 'H2', x: 0.127, y: 0.400, isDefense: true },
        { id: 'H3', x: 0.794, y: 0.432, isDefense: true },
        { id: 'C1', x: 0.54, y: 0.225, isDefense: true },
        { id: 'C2', x: 0.09, y: 0.145, isDefense: true },
        { id: 'C3', x: 0.14, y: 0.105, isDefense: true },
        { id: 'C4', x: 0.20, y: 0.065, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C1', points: [{ x: 0.095, y: 0.328 }, { x: 0.51, y: 0.11 }, { x: 0.54, y: 0.28 }], type: 'primary' },
      ],
      throw: { from: 'H1', to: 'C1' },
      narrative: {
        H1: 'C1 is cutting upfield, then curling back under into the open middle. Hit them with the under throw.',
        C1: "Cut hard upfield to draw your defender deep, then curl back under. Look for the throw immediately.",
        C4: "Get ready — once C1 connects, you're cutting back under for the continuation.",
        C2: "If C1 doesn't come down with it, you're the next under option off a reset.",
        C3: 'Hold your spacing and watch the under develop.',
        H2: 'Hold your spacing and watch the under develop.',
        H3: 'Hold your spacing and watch the under develop.',
      },
      quiz: {
        C1: {
          question: "You're curling back under. If you don't get the disc here, who's the next under option?",
          options: ['C2', 'C3', 'C4', 'H2'],
          correctIndex: 0,
          explanation: 'C2 is the second under, activating off a reset if C1 is covered.',
        },
      },
    },
    {
      id: 'flood-4-continuation',
      label: 'C4 Cuts Under — Continuation',
      force: 'none',
      players: [
        { id: 'H1', x: 0.486, y: 0.455 },
        { id: 'H2', x: 0.127, y: 0.455 },
        { id: 'H3', x: 0.794, y: 0.487 },
        { id: 'C1', x: 0.54, y: 0.28, hasDisc: true },
        { id: 'C2', x: 0.09, y: 0.20 },
        { id: 'C3', x: 0.14, y: 0.16 },
        { id: 'C4', x: 0.65, y: 0.22 },
        { id: 'H1', x: 0.486, y: 0.400, isDefense: true },
        { id: 'H2', x: 0.127, y: 0.400, isDefense: true },
        { id: 'H3', x: 0.794, y: 0.432, isDefense: true },
        { id: 'C1', x: 0.54, y: 0.225, isDefense: true },
        { id: 'C2', x: 0.09, y: 0.145, isDefense: true },
        { id: 'C3', x: 0.14, y: 0.105, isDefense: true },
        { id: 'C4', x: 0.65, y: 0.165, isDefense: true },
      ],
      pathPreviews: [
        { playerId: 'C4', points: [{ x: 0.20, y: 0.12 }, { x: 0.65, y: 0.22 }], type: 'primary' },
      ],
      throw: { from: 'C1', to: 'C4' },
      narrative: {
        C1: 'Disc secured! C4 is cutting back under toward the middle — hit them right away before the defense recovers.',
        C4: "This is your cut — come back under toward the open side. Catch and look upfield immediately.",
        H1: 'Great under connect. Watch C4 cut back under for the continuation.',
        C2: 'Continue upfield spacing, ready to reset the flow.',
        C3: 'Continue upfield spacing, ready to reset the flow.',
        H2: 'Continue upfield spacing, ready to reset the flow.',
        H3: 'Continue upfield spacing, ready to reset the flow.',
      },
    },
    {
      id: 'flood-5-reset-option',
      label: 'Reset Option (if C1 is Covered)',
      force: 'none',
      players: [
        { id: 'H1', x: 0.486, y: 0.455 },
        { id: 'H2', x: 0.127, y: 0.455 },
        { id: 'H3', x: 0.794, y: 0.487 },
        { id: 'C1', x: 0.54, y: 0.28 },
        { id: 'C2', x: 0.09, y: 0.20 },
        { id: 'C3', x: 0.14, y: 0.16 },
        { id: 'C4', x: 0.65, y: 0.22, hasDisc: true },
        { id: 'H1', x: 0.486, y: 0.400, isDefense: true },
        { id: 'H2', x: 0.127, y: 0.400, isDefense: true },
        { id: 'H3', x: 0.794, y: 0.432, isDefense: true },
        { id: 'C1', x: 0.54, y: 0.225, isDefense: true },
        { id: 'C2', x: 0.09, y: 0.145, isDefense: true },
        { id: 'C3', x: 0.14, y: 0.105, isDefense: true },
        { id: 'C4', x: 0.65, y: 0.165, isDefense: true },
      ],
      pathPreviews: [],
      narrative: {
        H1: "If C1's under look is covered, C2 becomes the second under option off a reset — we keep working the disc up the line.",
        C1: "If you don't get the under look, stay patient — C2 is next up as the backup under cutter.",
        C2: "You're the release valve: if C1 is covered, cut under next off the reset.",
        C4: 'Whether the disc comes to you now or after a reset, stay ready as the continuation cutter.',
        C3: 'Stay wide as an outlet.',
        H2: 'Stay ready to reset the disc if the flow needs to restart.',
        H3: 'Stay ready to reset the disc if the flow needs to restart.',
      },
    },
  ],
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit
```

Step through `/plays/flood` fully — confirm C4 clears to the corner alongside C2/C3 in step 2, then cuts back under (tracing its dashed path per Task 1) in step 4 to receive the continuation throw from C1.

- [ ] **Step 3: Commit**

```bash
git add src/data/plays/flood.ts
git commit -m "fix: give Flood's C4 an active clear-then-cut-under role instead of holding static"
```

---

### Task 4: Extract PlayControls, render responsively

**Files:**
- Create: `src/components/sidebar/PlayControls.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/app/plays/[playId]/page.tsx`

- [ ] **Step 1: Write PlayControls**

```tsx
// src/components/sidebar/PlayControls.tsx
import type { PlayStep, PlayBranch } from '@/types/play'
import { StepControls } from './StepControls'
import { BranchChoice } from './BranchChoice'

type PlayControlsProps = {
  step: PlayStep
  stepIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  nextDisabled: boolean
  onPrev: () => void
  onNext: () => void
  onChooseBranch: (branch: PlayBranch) => void
  className?: string
}

export function PlayControls({
  step, stepIndex, totalSteps, isFirst, isLast, nextDisabled, onPrev, onNext, onChooseBranch, className,
}: PlayControlsProps) {
  return (
    <div className={className}>
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
          totalSteps={totalSteps}
          isFirst={isFirst}
          isLast={isLast}
          nextDisabled={nextDisabled}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Sidebar renders the desktop copy, PlayPicker becomes desktop-only**

```tsx
// src/components/sidebar/Sidebar.tsx — replace the PlayPicker line and the branches/StepControls block
      <div className="hidden md:block">
        <PlayPicker currentPlay={play} />
      </div>
      <PlayControls
        step={step}
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!!quiz && !quizPassed}
        onPrev={onPrev}
        onNext={onNext}
        onChooseBranch={onChooseBranch}
        className="hidden md:block"
      />
```

Remove the now-unused `StepControls`/`BranchChoice` imports from `Sidebar.tsx` and add `import { PlayControls } from './PlayControls'`.

- [ ] **Step 3: Play page renders the mobile copy right after the field**

In `src/app/plays/[playId]/page.tsx`, add `import { PlayControls } from '@/components/sidebar/PlayControls'`, and insert directly after the field's wrapping `<div>` (before `<Sidebar>`):

```tsx
      <PlayControls
        step={step}
        stepIndex={stepIndex}
        totalSteps={play.steps.length}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!!quiz && !quizPassed}
        onPrev={prev}
        onNext={next}
        onChooseBranch={(branch) => goToStep(branch.nextStepId)}
        className="md:hidden px-4"
      />
```

- [ ] **Step 4: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

Resize to a mobile viewport (e.g. 390×844) on `/plays/flood` — confirm Prev/Next appear directly under the field, not at the bottom of the sidebar content. Resize back to desktop width — confirm Prev/Next are back at the bottom of the sidebar column, in their original position. Visit `/plays/reverse` step 3 (a branch step) at mobile width — confirm the branch choice (not Next) appears under the field.

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/PlayControls.tsx src/components/sidebar/Sidebar.tsx "src/app/plays/[playId]/page.tsx"
git commit -m "feat: move Prev/Next/branch controls directly under the field on mobile"
```

---

### Task 5: Picker drawer with floating hamburger button (mobile only)

**Files:**
- Create: `src/components/sidebar/PickerDrawer.tsx`
- Modify: `src/app/plays/[playId]/page.tsx`

- [ ] **Step 1: Write PickerDrawer**

```tsx
// src/components/sidebar/PickerDrawer.tsx
'use client'
import { useState } from 'react'
import { PlayPicker } from './PlayPicker'
import type { Play } from '@/types/play'

export function PickerDrawer({ currentPlay }: { currentPlay: Play }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open play picker"
        className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-bg border-l border-border p-4 overflow-y-auto">
            <button onClick={() => setOpen(false)} className="mb-4 text-text-muted hover:text-text">
              ✕ Close
            </button>
            <PlayPicker currentPlay={currentPlay} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Mount it inside the field's wrapper, which needs relative positioning**

In `src/app/plays/[playId]/page.tsx`, add `import { PickerDrawer } from '@/components/sidebar/PickerDrawer'`, change the field wrapper `<div className="w-full h-full rounded-xl border border-border bg-surface overflow-hidden">` to add `relative` (`"relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden"`), and add `<PickerDrawer currentPlay={play} />` as a sibling right after `<FieldCanvas .../>` inside that wrapper.

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
npm run dev
```

At a mobile viewport, confirm a floating circular button appears in the top-right corner of the field. Tap it — confirm a dark drawer slides in from the right showing the play picker (defaulting to the current play's breadcrumb, exactly like the desktop sidebar version). Tap the backdrop or the close button — confirm it dismisses. Select a different play from inside the drawer — confirm it navigates correctly. Resize to desktop width — confirm the hamburger button and drawer are both absent, and the sidebar's inline picker is the only one visible.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/PickerDrawer.tsx "src/app/plays/[playId]/page.tsx"
git commit -m "feat: add mobile play picker drawer with floating hamburger trigger"
```

---

## Self-Review

**Spec coverage:** all five items from the design spec (path-following animation, conditional endzone, Flood fix, controls relocation, picker drawer) have a task above.

**Placeholder scan:** none — every step has complete code.

**Type consistency:** `PlayerTokens`' new `pathPreviews: PlayerPath[]` prop matches `PlayStep.pathPreviews`'s type exactly; `PlayerToken`'s new `pathPoints?: { px: number; py: number }[]` matches `toPixel`'s return shape; `FieldCanvas`'s new `playSet: Play['set']` matches `Play.set`'s type; `PlayControls`' prop names match exactly between its two call sites (`Sidebar.tsx` and the play page).
