'use client'
import { useState } from 'react'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { PlayerPath } from '@/types/play'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { CATEGORY_LABELS, SET_LABELS, ALL_CATEGORIES, ALL_SETS } from '@/lib/playLabels'
import { getSequenceAtPath } from '@/lib/designerSteps'
import { StepTree } from './StepTree'
import { AddBranchForm, AddAnotherBranchForm } from './BranchForms'

const PATH_TYPES: PlayerPath['type'][] = ['primary', 'secondary', 'clear', 'reset']

export function MobileStepSheet({ designer }: { designer: ReturnType<typeof useDesignerState> }) {
  const [expanded, setExpanded] = useState(false)
  const {
    steps, currentStep, currentPath, mode, selectedIndex, multiSelected, setMultiSelected,
    pathType, setPathType, inProgressPath, finishPath, cancelPath, removePath,
    setDiscHolder, clearDiscHolder, clearThrow, addStep, deleteStep, goToStep,
    category, setCategory, set, setSet, addBranch, addAnotherBranch, removeBranch,
  } = designer

  const isBranchPoint = !!currentStep.branches && currentStep.branches.length > 0
  const holderIndex = currentStep.players.findIndex((p) => p.hasDisc)
  const sequence = getSequenceAtPath(steps, currentPath)
  const currentIndex = currentPath[currentPath.length - 1]
  const branchCount = currentStep.branches?.length ?? 0
  const summary = `Step ${currentIndex + 1} of ${sequence.length}${branchCount > 0 ? ` · ${branchCount} branch${branchCount === 1 ? '' : 'es'}` : ''}`

  return (
    <div className="fixed left-0 right-0 bottom-16 z-20 bg-surface border-t border-border">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2.5 px-3 h-[62px]"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {sequence.map((_, i) => (
            <div
              key={i}
              className={`w-9 h-[30px] rounded-md border shrink-0 ${
                i === currentIndex ? 'bg-surface-raised border-accent' : 'bg-bg border-border'
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 text-[9.5px] text-text-muted whitespace-nowrap">
          {summary} {expanded ? '▾' : '▴'}
        </span>
      </button>

      {expanded && (
        <div className="max-h-[50vh] overflow-y-auto border-t border-border p-4 flex flex-col gap-5">
          {mode === 'path' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-text-muted">Path Type</span>
              <div className="flex items-center gap-2">
                {PATH_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPathType(t)}
                    title={t}
                    className="w-6 h-6 rounded-full border-2"
                    style={{ backgroundColor: PATH_COLOR[t], borderColor: pathType === t ? 'white' : 'transparent' }}
                  />
                ))}
                {inProgressPath && (
                  <>
                    <button onClick={finishPath} className="min-h-11 px-2 py-1 text-sm rounded-md border border-accent text-accent">
                      Finish Path
                    </button>
                    <button onClick={cancelPath} className="min-h-11 px-2 py-1 text-sm rounded-md border border-border text-text-muted">
                      Cancel
                    </button>
                  </>
                )}
              </div>
              {currentStep.pathPreviews.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-text-muted">Paths on This Step</span>
                  {currentStep.pathPreviews.map((path, i) => (
                    <div key={`${path.playerId}-${path.isDefense ? 'd' : 'o'}-${i}`} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: PATH_COLOR[path.type] }} />
                      <span className="flex-1 text-sm text-text">
                        {path.isDefense ? GENERIC_DEFENDER_LABELS[path.playerId] : path.playerId}
                      </span>
                      <button
                        onClick={() => removePath(path.playerId, !!path.isDefense)}
                        aria-label={`Remove path for ${path.playerId}`}
                        className="min-h-11 flex items-center text-xs text-text-muted hover:text-danger-border"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'select' && (
            <div className="flex items-center gap-2 self-start px-2 py-1 rounded-full border border-border text-xs text-text-muted">
              <span>{multiSelected.length === 0 ? 'No players selected' : `${multiSelected.length} player${multiSelected.length === 1 ? '' : 's'} selected`}</span>
              {multiSelected.length > 0 && (
                <button onClick={() => setMultiSelected([])} className="min-h-11 flex items-center text-text-muted hover:text-danger-border">
                  Clear
                </button>
              )}
            </div>
          )}

          {mode === 'position' && selectedIndex !== null && (
            <button
              onClick={() => setDiscHolder(selectedIndex)}
              className="min-h-11 px-2 py-1 text-sm rounded-md border border-border text-text self-start"
            >
              {currentStep.players[selectedIndex].hasDisc ? 'Has Disc ✓' : 'Set as Disc Holder'}
            </button>
          )}

          {mode === 'throw' && selectedIndex !== null && (() => {
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

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">Formation</span>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="flex-1 min-w-0 min-h-11 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <select
                value={set}
                onChange={(e) => setSet(e.target.value as typeof set)}
                className="flex-1 min-w-0 min-h-11 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
              >
                {ALL_SETS.map((s) => (
                  <option key={s} value={s}>{SET_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">Steps</span>
            <StepTree
              steps={steps}
              pathPrefix={[]}
              currentPath={currentPath}
              onSelect={goToStep}
              onDelete={deleteStep}
              onRemoveBranch={removeBranch}
              depth={0}
            />
            {!isBranchPoint && (
              <button
                onClick={addStep}
                disabled={!!inProgressPath}
                title={inProgressPath ? 'Finish or cancel the in-progress path first' : undefined}
                className="min-h-11 px-2 py-1 text-sm rounded-md border border-accent text-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Step
              </button>
            )}
            {!isBranchPoint && <AddBranchForm onAdd={addBranch} />}
            {isBranchPoint && <AddAnotherBranchForm onAdd={addAnotherBranch} />}
          </div>
        </div>
      )}
    </div>
  )
}
