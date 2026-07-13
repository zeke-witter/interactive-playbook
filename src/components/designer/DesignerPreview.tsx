'use client'
import { useState } from 'react'
import { FieldBackground } from '@/components/field/FieldBackground'
import { PathPreviews } from '@/components/field/PathPreviews'
import { PlayerToken } from '@/components/field/PlayerToken'
import { Disc } from '@/components/field/Disc'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { FIELD_WIDTH, FIELD_HEIGHT, toPixel } from '@/lib/field'
import { getStepAtPath, getSequenceAtPath } from '@/lib/designerSteps'
import type { DesignerStep, StepPath } from '@/types/designer'
import type { Play } from '@/types/play'

type DesignerPreviewProps = {
  steps: DesignerStep[]
  category: Play['category']
  set: Play['set']
  onExit: () => void
}

function branchTrail(root: DesignerStep[], path: StepPath): string[] {
  const labels: string[] = []
  for (let i = 1; i < path.length; i += 2) {
    const parentStep = getStepAtPath(root, path.slice(0, i))
    labels.push(parentStep.branches![path[i]].label)
  }
  return labels
}

// Total step-hops taken to reach `path`: the sum of the step-index at every
// step-hop along it (root sequence plus every branch entered), +1 each,
// since a step-index of 0 is still one step taken. This increments by
// exactly 1 on every Prev/Next/branch-choice action, unlike `path.length`
// (which only changes when entering/exiting a branch, not on ordinary
// same-sequence Next clicks).
function stepNumberFor(path: StepPath): number {
  let total = 0
  for (let i = 0; i < path.length; i += 2) {
    total += path[i] + 1
  }
  return total
}

export function DesignerPreview({ steps, category, set, onExit }: DesignerPreviewProps) {
  const [previewPath, setPreviewPath] = useState<StepPath>([0])

  const previewStep = getStepAtPath(steps, previewPath)
  const sequence = getSequenceAtPath(steps, previewPath)
  const currentIndex = previewPath[previewPath.length - 1]
  const isBranchPoint = !!previewStep.branches && previewStep.branches.length > 0
  const hasNext = !isBranchPoint && currentIndex + 1 < sequence.length
  const canGoPrev = previewPath.length > 1 || currentIndex > 0
  const stepNumber = stepNumberFor(previewPath)
  const trail = branchTrail(steps, previewPath)
  const showEndzone = set === 'endzone'

  function goNext() {
    if (!hasNext) return
    setPreviewPath([...previewPath.slice(0, -1), currentIndex + 1])
  }

  function goPrev() {
    if (!canGoPrev) return
    if (currentIndex > 0) {
      setPreviewPath([...previewPath.slice(0, -1), currentIndex - 1])
    } else {
      setPreviewPath(previewPath.slice(0, -2))
    }
  }

  function chooseBranch(branchIndex: number) {
    setPreviewPath([...previewPath, branchIndex, 0])
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Step {stepNumber}</p>
          {trail.length > 0 && (
            <p className="text-xs text-text-muted">via {trail.join(' → ')}</p>
          )}
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1 text-sm rounded-md border border-border text-text-muted hover:text-text"
        >
          Exit Preview
        </button>
      </div>

      <div className="relative flex-1 rounded-xl border border-border bg-surface overflow-hidden">
        <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full h-full">
          <FieldBackground showEndzone={showEndzone} />
          <PathPreviews paths={previewStep.pathPreviews} />
          {previewStep.players.map((player, i) => {
            const label = player.isDefense ? GENERIC_DEFENDER_LABELS[player.id] : player.id
            const path = !player.isDefense ? previewStep.pathPreviews.find((p) => p.playerId === player.id && !p.isDefense) : undefined
            const pathPoints = path?.points.map((pt) => toPixel(pt.x, pt.y))
            return (
              <PlayerToken
                // Must match PlayerTokens.tsx's key format exactly — this is what
                // lets Framer Motion tween a token's position between steps
                // instead of remounting it (remounting would replay the
                // entrance animation on every Next/Prev instead of a smooth slide).
                key={`${player.id}-${player.isDefense ? 'd' : 'o'}-${i}`}
                player={player}
                isYou={false}
                dimmed={false}
                enterIndex={i}
                label={label}
                pathPoints={pathPoints}
                playCategory={category}
              />
            )
          })}
          <Disc step={{ id: previewPath.join('-'), players: previewStep.players, throw: previewStep.throw }} />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="px-3 py-1 text-sm rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {isBranchPoint ? (
          <div className="flex flex-1 flex-wrap gap-2">
            {previewStep.branches!.map((branch, i) => (
              <button
                key={i}
                onClick={() => chooseBranch(i)}
                className="px-3 py-1 text-sm rounded-md border border-accent text-accent"
              >
                {branch.label}
              </button>
            ))}
          </div>
        ) : hasNext ? (
          <button
            onClick={goNext}
            className="px-3 py-1 text-sm rounded-md border border-accent bg-accent text-accent-foreground"
          >
            Next
          </button>
        ) : (
          <p className="flex-1 text-sm text-text-muted">End of play</p>
        )}
      </div>
    </div>
  )
}
