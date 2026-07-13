'use client'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { PlayerPath } from '@/types/play'
import type { DesignerMode } from '@/types/designer'
import { PATH_COLOR } from '@/lib/pathColors'
import { GENERIC_DEFENDER_LABELS } from '@/lib/names'
import { CATEGORY_LABELS, SET_LABELS, ALL_CATEGORIES, ALL_SETS } from '@/lib/playLabels'
import { StepTree } from './StepTree'
import { AddBranchForm, AddAnotherBranchForm } from './BranchForms'

type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
  draftNames: string[]
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onPreview: () => void
}

const PATH_TYPES: PlayerPath['type'][] = ['primary', 'secondary', 'clear', 'reset']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', path: 'Draw Path', throw: 'Mark Throw' }
const MODES: DesignerMode[] = ['position', 'path', 'throw']

export function DesignerToolbar({ designer, onSave, draftNames, onLoadDraft, onDeleteDraft, onPreview }: DesignerToolbarProps) {
  const {
    steps, currentPath, currentStep, mode, setMode, selectedIndex,
    pathType, setPathType, inProgressPath, finishPath, cancelPath, removePath,
    setDiscHolder, clearDiscHolder, clearThrow, addStep, deleteStep, goToStep, category, setCategory, set, setSet,
    addBranch, addAnotherBranch, removeBranch, undo, redo, canUndo, canRedo, newPlay,
  } = designer

  const isBranchPoint = !!currentStep.branches && currentStep.branches.length > 0

  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="px-3 py-1 text-sm rounded-md border border-accent text-accent"
        >
          ▶ Preview
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
          className="px-3 py-1 text-sm rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          className="px-3 py-1 text-sm rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Redo
        </button>
      </div>

      <div className="flex flex-col gap-2 p-2 border border-border rounded-md">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted">Play File</span>
          <button
            onClick={() => {
              if (window.confirm('Start a new play? This clears everything on the canvas (Undo will bring it back if you change your mind).')) {
                newPlay()
              }
            }}
            className="text-xs text-text-muted hover:text-danger-border"
          >
            New Play
          </button>
        </div>
        <SaveForm onSave={onSave} />
        {draftNames.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">Load Draft</span>
            {draftNames.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <button
                  onClick={() => onLoadDraft(name)}
                  className="flex-1 text-left px-2 py-1 rounded-md border border-border text-text text-sm transition-colors hover:border-[#3a4152]"
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
      </div>

      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-md border text-sm transition-colors ${
              mode === m
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-transparent text-text-muted hover:bg-surface-raised hover:text-text'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === 'path' && (
        <div className="flex items-center gap-2">
          {PATH_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setPathType(t)}
              title={t}
              className="w-5 h-5 rounded-full border-2"
              style={{ backgroundColor: PATH_COLOR[t], borderColor: pathType === t ? 'white' : 'transparent' }}
            />
          ))}
          {inProgressPath && (
            <>
              <button onClick={finishPath} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
                Finish Path
              </button>
              <button onClick={cancelPath} className="px-2 py-1 text-sm rounded-md border border-border text-text-muted">
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'path' && currentStep.pathPreviews.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Paths on This Step</span>
          {currentStep.pathPreviews.map((path, i) => (
            <div key={`${path.playerId}-${path.isDefense ? 'd' : 'o'}-${i}`} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-border shrink-0"
                style={{ backgroundColor: PATH_COLOR[path.type] }}
              />
              <span className="flex-1 text-sm text-text">
                {path.isDefense ? GENERIC_DEFENDER_LABELS[path.playerId] : path.playerId}
              </span>
              <button
                onClick={() => removePath(path.playerId, !!path.isDefense)}
                aria-label={`Remove path for ${path.playerId}`}
                className="text-xs text-text-muted hover:text-danger-border"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'position' && selectedIndex !== null && (
        <button
          onClick={() => setDiscHolder(selectedIndex)}
          className="px-2 py-1 text-sm rounded-md border border-border text-text self-start"
        >
          {currentStep.players[selectedIndex].hasDisc ? 'Has Disc ✓' : 'Set as Disc Holder'}
        </button>
      )}

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

      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={set}
          onChange={(e) => setSet(e.target.value as typeof set)}
          className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
        >
          {ALL_SETS.map((s) => (
            <option key={s} value={s}>{SET_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
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
            className="px-2 py-1 text-sm rounded-md border border-accent text-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add Step
          </button>
        )}
        {!isBranchPoint && <AddBranchForm onAdd={addBranch} />}
        {isBranchPoint && <AddAnotherBranchForm onAdd={addAnotherBranch} />}
      </div>

    </div>
  )
}

function SaveForm({ onSave }: { onSave: (name: string) => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
        if (input.value.trim()) onSave(input.value.trim())
      }}
    >
      <input
        name="name"
        placeholder="play-name"
        className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
      />
      <button type="submit" className="px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm">
        Save
      </button>
    </form>
  )
}
