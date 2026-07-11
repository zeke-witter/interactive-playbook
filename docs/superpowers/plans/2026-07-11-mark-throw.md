# Mark Throw Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Play Designer's click-click "Mark Throw" flow with a drag-from-the-disc-holder-to-the-receiver gesture that gives continuous visual feedback (a persistent holder highlight, a live hover highlight on the drag target, a distinct "committed" color once set, and an instructional pill), plus add "Has disc"/"Receiving disc" status chips in Mark Throw mode with context-aware remove controls.

**Architecture:** `DraggableToken`'s prop contract changes from a boolean `isSelected` to a parent-computed `ringColor: string | null`, and gains an optional `onDragEnd` callback fired when a real drag (not a plain click) ends — both changes are consumed entirely by `DesignerCanvas`, their only caller, so both land in one task. `DesignerCanvas` gains local (non-hook) drag state for the live gesture (cursor position, hover target), a geometric hit-test reusing the same field-pixel coordinate conversion already used everywhere else in the canvas, ring-color computation per mode, and the instructional pill. Two new thin hook functions (`clearDiscHolder`, `clearThrow`) and the toolbar's new chip UI land in a second task, since they only need `setThrow`/`selectedIndex`/`currentStep` — not the drag mechanics themselves.

**Tech Stack:** Next.js 16, React 19, TypeScript, native Pointer Events (no new libraries — same `setPointerCapture`/`toSvgPoint` pattern used by every existing draggable token in this app). No automated tests — hobby project, explicit no-testing policy; verification is `npx tsc --noEmit` plus manual/Playwright exercise of the running app.

## Global Constraints

- No automated tests of any kind.
- Ring colors: holder = `#a3e635` (the app's existing accent lime), live hover-during-drag = `white` (matches the existing selection-ring convention), committed receiver = `#4ade80` (the app's existing success green) — no new colors.
- The disc holder never physically moves during the throw-drag gesture — only a small ghost circle follows the cursor. The holder itself is never a valid hover/drop target.
- Hit-test radius for "is the cursor over this player": 4.5 field units (a token's own circle radius is 3.2).
- The "Has disc" chip's × (remove) control is shown only when `currentPath` is exactly `[0]` (the play's very first step) — every other step's holder comes from an automatic transfer, not manual assignment. The "Receiving disc" chip's × is always shown.
- This task set changes only `src/components/designer/DraggableToken.tsx`, `src/components/designer/DesignerCanvas.tsx`, `src/hooks/useDesignerState.ts`, `src/components/designer/DesignerToolbar.tsx`. No changes to the shipped play-viewer or its components.

---

### Task 1: Drag-to-target throw gesture (`DraggableToken` + `DesignerCanvas`)

**Files:**
- Modify: `src/components/designer/DraggableToken.tsx` (full rewrite — small file)
- Modify: `src/components/designer/DesignerCanvas.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useDesignerState`'s existing `currentStep`, `mode`, `selectedIndex`, `selectToken`, `moveToken`, `inProgressPath`, `startPath`, `addWaypoint`, `setThrow`, `set`, `pathType` (all pre-existing, unchanged signatures).
- Produces: `DraggableToken`'s new prop contract (`ringColor: string | null` replacing `isSelected: boolean`; new optional `onDragEnd?: () => void`) — `DesignerCanvas` is its only caller, both land in this same task so nothing is left half-migrated. No other task depends on anything new from this task; Task 2 only needs `setThrow`/`selectedIndex`/`currentStep`/`currentPath`, all pre-existing.

- [ ] **Step 1: Rewrite `DraggableToken.tsx`**

Replace the full contents of `src/components/designer/DraggableToken.tsx`:

```tsx
'use client'
import { useRef } from 'react'
import { toPixel } from '@/lib/field'

type DraggableTokenProps = {
  x: number
  y: number
  label: string
  isDefense: boolean
  ringColor: string | null
  isDiscHolder: boolean
  draggable: boolean
  toSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
  onMove: (x: number, y: number) => void
  onDragEnd?: () => void
  onClick: () => void
}

export function DraggableToken({
  x, y, label, isDefense, ringColor, isDiscHolder, draggable, toSvgPoint, onMove, onDragEnd, onClick,
}: DraggableTokenProps) {
  const draggingRef = useRef(false)
  const movedRef = useRef(false)

  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    if (!draggable) return
    draggingRef.current = true
    movedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!draggingRef.current) return
    movedRef.current = true
    const point = toSvgPoint(e.clientX, e.clientY)
    onMove(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation()
    const wasDragging = draggingRef.current
    draggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (!wasDragging || !movedRef.current) {
      onClick()
    } else {
      onDragEnd?.()
    }
  }

  const { px, py } = toPixel(x, y)
  const fill = isDefense ? '#dc2626' : '#2563eb'

  return (
    <g
      transform={`translate(${px}, ${py})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: draggable ? 'grab' : 'pointer' }}
    >
      <circle r={3.2} fill={fill} />
      {ringColor && <circle r={4.2} fill="none" stroke={ringColor} strokeWidth={0.6} />}
      {isDiscHolder && <circle cx={2.4} cy={-2.4} r={1} fill="white" stroke="black" strokeWidth={0.2} />}
      <text y={1} fontSize={2.6} fill="white" textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </g>
  )
}
```

What changed from before: `isSelected: boolean` is gone; the caller now passes the exact ring color (or `null` for no ring) via `ringColor`. `onDragEnd` is a new optional callback that fires on pointerup precisely when a real drag happened (`wasDragging && movedRef.current` — the same condition that previously meant "don't call onClick"), so the parent can finalize a throw-drag gesture; when a plain click happens instead, behavior is unchanged (`onClick()` fires, `onDragEnd` does not).

- [ ] **Step 2: Rewrite `DesignerCanvas.tsx`**

Replace the full contents of `src/components/designer/DesignerCanvas.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { DraggableToken } from './DraggableToken'
import type { useDesignerState } from '@/hooks/useDesignerState'

type DesignerCanvasProps = {
  designer: ReturnType<typeof useDesignerState>
}

const DISC_HOVER_RADIUS = 4.5
const HOLDER_RING = '#a3e635'
const RECEIVER_RING = '#4ade80'

type DiscDrag = { holderIndex: number; cursorPx: number; cursorPy: number; hoverIndex: number | null }

export function DesignerCanvas({ designer }: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [discDrag, setDiscDrag] = useState<DiscDrag | null>(null)
  const {
    currentStep, mode, selectedIndex, selectToken, moveToken,
    inProgressPath, startPath, addWaypoint, setThrow, set, pathType,
  } = designer
  const showEndzone = set === 'endzone'
  const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(ctm.inverse())
    return { x: transformed.x / FIELD_WIDTH, y: transformed.y / FIELD_HEIGHT }
  }

  function findHoverTarget(cursorPx: number, cursorPy: number): number | null {
    let closest: { index: number; dist: number } | null = null
    currentStep.players.forEach((p, i) => {
      if (i === holderIndex || p.isDefense) return
      const target = toPixel(p.x, p.y)
      const dist = Math.hypot(target.px - cursorPx, target.py - cursorPy)
      if (dist <= DISC_HOVER_RADIUS && (!closest || dist < closest.dist)) {
        closest = { index: i, dist }
      }
    })
    return closest ? closest.index : null
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (mode !== 'path' || !inProgressPath) return
    const point = toSvgPoint(e.clientX, e.clientY)
    addWaypoint(Math.min(1, Math.max(0, point.x)), Math.min(1, Math.max(0, point.y)))
  }

  function handleTokenClick(index: number) {
    if (mode === 'position') {
      selectToken(index)
      return
    }
    if (mode === 'path') {
      if (!inProgressPath && !currentStep.players[index].isDefense) startPath(index)
      return
    }
    if (mode === 'throw') {
      if (!currentStep.players[index].isDefense) selectToken(index)
      return
    }
  }

  function handleHolderDragMove(fieldX: number, fieldY: number) {
    const { px, py } = toPixel(fieldX, fieldY)
    setDiscDrag({ holderIndex, cursorPx: px, cursorPy: py, hoverIndex: findHoverTarget(px, py) })
  }

  function handleHolderDragEnd() {
    if (discDrag?.hoverIndex != null) {
      setThrow(holderIndex, discDrag.hoverIndex)
    }
    setDiscDrag(null)
  }

  function ringColorFor(index: number): string | null {
    if (mode === 'throw') {
      if (discDrag) {
        if (index === discDrag.holderIndex) return HOLDER_RING
        if (index === discDrag.hoverIndex) return 'white'
        return null
      }
      if (index === holderIndex) return HOLDER_RING
      const player = currentStep.players[index]
      if (!player.isDefense && currentStep.throw?.to === player.id) return RECEIVER_RING
      return selectedIndex === index ? 'white' : null
    }
    return selectedIndex === index ? 'white' : null
  }

  const finishedPaths = currentStep.pathPreviews.map((path, i) => {
    const points = path.points.map((pt) => {
      const { px, py } = toPixel(pt.x, pt.y)
      return `${px},${py}`
    }).join(' ')
    return (
      <polyline
        key={`${path.playerId}-${i}`}
        points={points}
        fill="none"
        stroke={PATH_COLOR[path.type]}
        strokeWidth={0.6}
        strokeDasharray="2,1.5"
      />
    )
  })

  const inProgressLine = inProgressPath && inProgressPath.points.length > 1 && (
    <polyline
      points={inProgressPath.points.map((pt) => {
        const { px, py } = toPixel(pt.x, pt.y)
        return `${px},${py}`
      }).join(' ')}
      fill="none"
      stroke={PATH_COLOR[pathType]}
      strokeWidth={0.6}
      strokeDasharray="2,1.5"
      opacity={0.6}
    />
  )

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        className="w-full h-full"
        onPointerDown={handleBackgroundPointerDown}
      >
        <FieldBackground showEndzone={showEndzone} />
        {finishedPaths}
        {inProgressLine}
        {currentStep.players.map((player, i) => (
          <DraggableToken
            key={i}
            x={player.x}
            y={player.y}
            label={player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id}
            isDefense={!!player.isDefense}
            ringColor={ringColorFor(i)}
            isDiscHolder={!!player.hasDisc}
            draggable={mode === 'position' || (mode === 'throw' && i === holderIndex)}
            toSvgPoint={toSvgPoint}
            onMove={(x, y) => {
              if (mode === 'throw' && i === holderIndex) {
                handleHolderDragMove(x, y)
              } else if (mode === 'position') {
                moveToken(i, x, y)
              }
            }}
            onDragEnd={mode === 'throw' && i === holderIndex ? handleHolderDragEnd : undefined}
            onClick={() => handleTokenClick(i)}
          />
        ))}
        {discDrag && (
          <circle
            cx={discDrag.cursorPx}
            cy={discDrag.cursorPy}
            r={1.4}
            fill="white"
            stroke="black"
            strokeWidth={0.2}
            pointerEvents="none"
          />
        )}
      </svg>
      {mode === 'throw' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-raised/90 border border-accent text-xs text-text pointer-events-none">
          Click and drag disc to the receiver
        </div>
      )}
    </>
  )
}
```

What changed from before: the old two-click `mode === 'throw'` branch in `handleTokenClick` (select holder, then click target) is gone, replaced by a plain "click selects for chip display" behavior. The holder token is now `draggable` while in throw mode (so its pointer-drag machinery activates), and its `onMove` routes to `handleHolderDragMove` (tracks cursor + finds hover target) instead of `moveToken` (which would reposition it) — the holder's `x`/`y` props themselves never change during this gesture, so it visually stays put. `onDragEnd` (fired only when a real drag happened) commits the throw if a valid hover target existed at release, or does nothing otherwise. `ringColorFor` centralizes every ring-color decision the token list needs, and the return value is now wrapped in a `<>` fragment so the instructional pill can be absolutely positioned against the canvas's existing `position: relative` parent (`src/app/designer/page.tsx`'s wrapping div) with no changes needed there.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. In Position mode, set a disc holder on one offense player (e.g. H1).
2. Switch to Mark Throw mode. Confirm H1 now shows a lime/accent ring (not the plain white selection ring), and an instructional pill reading "Click and drag disc to the receiver" appears over the canvas.
3. Press down on H1's token and drag toward another offense player (e.g. H2) without releasing yet. Confirm a small white ghost disc circle follows the cursor, H1's position does not move, and H2's ring turns white as the cursor enters its hit radius (then reverts to no ring if you drag back out before releasing).
4. Release the pointer while over H2. Confirm H2's ring is now green, and H1's ring is still the accent color (unchanged — it's still the holder for this step, only the throw target changed).
5. Click elsewhere (an empty part of the field) — confirm nothing crashes and no chip shows.
6. Click H2 (a plain click, not a drag). Confirm a "Receiving disc" chip appears under the mode buttons (this may not be wired up until Task 2 — if the chip doesn't appear yet, confirm at least that `selectedIndex` changed by checking React DevTools or that clicking H2 doesn't throw any console errors; full chip verification happens in Task 2).
7. Confirm no console errors throughout.

- [ ] **Step 5: Commit**

```bash
git add src/components/designer/DraggableToken.tsx src/components/designer/DesignerCanvas.tsx
git commit -m "feat(designer): replace click-click Mark Throw with a drag-to-target gesture"
```

---

### Task 2: "Has disc" / "Receiving disc" chips

**Files:**
- Modify: `src/hooks/useDesignerState.ts` (add `clearDiscHolder`, `clearThrow`)
- Modify: `src/components/designer/DesignerToolbar.tsx` (add the chip section)

**Interfaces:**
- Consumes: `setThrow`'s existing behavior, `currentStep`, `currentPath`, `selectedIndex`, `mode` — all pre-existing, and Task 1's `handleTokenClick` throw-mode branch (`selectToken(index)` on a plain click) which this task's toolbar reads via the hook's existing `selectedIndex`.
- Produces: `clearDiscHolder(): void` and `clearThrow(): void`, added to the hook's returned object. No other task depends on anything new here — this is the last task.

- [ ] **Step 1: Add `clearDiscHolder` and `clearThrow` to `useDesignerState.ts`**

In `src/hooks/useDesignerState.ts`, add these two functions immediately after `setThrow` (currently at lines 120-124):

```ts
  function clearDiscHolder() {
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p) => ({ ...p, hasDisc: false })),
    }))
  }

  function clearThrow() {
    updateCurrentStep((step) => ({ ...step, throw: undefined }))
  }
```

- [ ] **Step 2: Add both to the hook's returned object**

In the `return { ... }` block at the end of `useDesignerState`, add `clearDiscHolder,` and `clearThrow,` right after `setThrow,`:

```ts
    setDiscHolder,
    setThrow,
    clearDiscHolder,
    clearThrow,
    addStep,
```

- [ ] **Step 3: Add the chip section to `DesignerToolbar.tsx`**

In `src/components/designer/DesignerToolbar.tsx`, destructure the two new functions and `currentPath` alongside the existing destructured values (the current destructuring already includes `currentStep`, `selectedIndex`, `mode`, and `currentPath` — add `clearDiscHolder, clearThrow` to that same list):

```ts
  const {
    steps, currentPath, currentStep, mode, setMode, selectedIndex,
    pathType, setPathType, inProgressPath, finishPath, cancelPath,
    setDiscHolder, clearDiscHolder, clearThrow, addStep, deleteStep, goToStep, category, setCategory, set, setSet,
    addBranch, addAnotherBranch, removeBranch,
  } = designer
```

Add this block immediately after the existing `mode === 'position' && selectedIndex !== null` disc-holder button block (so it renders right after the mode-buttons row, matching "under the mode chip"):

```tsx
      {mode === 'throw' && selectedIndex !== null && (() => {
        const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)
        const player = currentStep.players[selectedIndex]
        const isStepOne = currentPath.length === 1 && currentPath[0] === 0
        if (selectedIndex === holderIndex) {
          return (
            <div className="flex items-center gap-2 self-start px-2 py-1 rounded-full border border-accent text-xs text-accent">
              <span>Has disc</span>
              {isStepOne && (
                <button onClick={clearDiscHolder} aria-label="Remove has-disc status" className="hover:text-danger-border">
                  ×
                </button>
              )}
            </div>
          )
        }
        if (!player.isDefense && currentStep.throw?.to === player.id) {
          return (
            <div className="flex items-center gap-2 self-start px-2 py-1 rounded-full border border-success-border text-xs text-success-border">
              <span>Receiving disc</span>
              <button onClick={clearThrow} aria-label="Remove receiving-disc status" className="hover:text-danger-border">
                ×
              </button>
            </div>
          )
        }
        return null
      })()}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/designer`.
1. On step 1, set a disc holder (Position mode), switch to Mark Throw mode, click the holder (plain click). Confirm a "Has disc" chip appears WITH a working × button; click × and confirm the holder's dot indicator and accent ring disappear (nobody holds the disc on this step anymore).
2. Re-set a holder, drag-throw to a receiver (per Task 1's gesture), click the receiver afterward. Confirm a "Receiving disc" chip appears with a × ; click × and confirm the receiver's green ring disappears and `currentStep.throw` is cleared (e.g. by checking that "+ Add Step" no longer transfers the disc, since there's no throw to transfer from anymore).
3. Add a second step (Step 2), set/confirm its disc holder via the automatic transfer from Step 1's throw, switch to Mark Throw mode on Step 2, click the holder. Confirm a "Has disc" chip appears WITHOUT an × (since this isn't step 1).
4. Confirm no console errors throughout.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDesignerState.ts src/components/designer/DesignerToolbar.tsx
git commit -m "feat(designer): add Has-disc/Receiving-disc chips with context-aware remove controls"
```

---

## Self-Review Notes

- **Spec coverage:** Holder highlight on entering Mark Throw mode (Task 1's `ringColorFor`, `index === holderIndex` case) ✅. Instructional pill (Task 1) ✅. Drag-from-holder with live hover highlighting and holder-excluded-from-targets (Task 1's `findHoverTarget` skipping `i === holderIndex`) ✅. Committed-receiver color persists independent of hover/hydration state (Task 1's `ringColorFor` checks `currentStep.throw?.to` even when `discDrag` is `null`) ✅. Plain-click-to-view chips (Task 1's `handleTokenClick` throw branch + Task 2's toolbar section) ✅. "Has disc" × only on step 1, "Receiving disc" × always (Task 2's `isStepOne` check) ✅. No change to Position mode's existing disc-holder button (untouched in both tasks) ✅.
- **Placeholder scan:** No TBD/TODO; every step has complete code.
- **Type consistency:** `DraggableToken`'s new `ringColor`/`onDragEnd` props are defined once in Task 1 and consumed identically by its only caller (`DesignerCanvas`, same task). `clearDiscHolder`/`clearThrow` are defined once in Task 2 and consumed identically by the toolbar (same task). No signature mismatch introduced anywhere.
