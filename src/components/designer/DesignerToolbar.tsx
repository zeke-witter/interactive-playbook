'use client'
import type { useDesignerState } from '@/hooks/useDesignerState'
import type { PlayerPath } from '@/types/play'
import type { DesignerMode } from '@/types/designer'
import { PATH_COLOR } from '@/lib/pathColors'

type DesignerToolbarProps = {
  designer: ReturnType<typeof useDesignerState>
  onSave: (name: string) => void
}

const PATH_TYPES: PlayerPath['type'][] = ['primary', 'secondary', 'clear', 'reset']
const MODE_LABELS: Record<DesignerMode, string> = { position: 'Position', path: 'Draw Path', throw: 'Mark Throw' }
const MODES: DesignerMode[] = ['position', 'path', 'throw']

export function DesignerToolbar({ designer, onSave }: DesignerToolbarProps) {
  const {
    steps, currentStepIndex, currentStep, mode, setMode, selectedIndex,
    pathType, setPathType, inProgressPath, finishPath, cancelPath,
    setDiscHolder, addStep, deleteStep, goToStep, isEndzone, setIsEndzone,
  } = designer

  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-md border text-sm ${
              mode === m ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-text'
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

      {mode === 'position' && selectedIndex !== null && (
        <button
          onClick={() => setDiscHolder(selectedIndex)}
          className="px-2 py-1 text-sm rounded-md border border-border text-text self-start"
        >
          {currentStep.players[selectedIndex].hasDisc ? 'Has Disc ✓' : 'Set as Disc Holder'}
        </button>
      )}

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={isEndzone} onChange={(e) => setIsEndzone(e.target.checked)} />
        Endzone play
      </label>

      <div className="flex flex-col gap-1">
        {steps.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => goToStep(i)}
              className={`flex-1 text-left px-2 py-1 rounded-md border text-sm ${
                i === currentStepIndex ? 'border-accent text-accent' : 'border-border text-text'
              }`}
            >
              Step {i + 1}
            </button>
            {steps.length > 1 && (
              <button onClick={() => deleteStep(i)} className="text-xs text-text-muted hover:text-danger-border">
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={addStep} className="px-2 py-1 text-sm rounded-md border border-accent text-accent">
          + Add Step
        </button>
      </div>

      <SaveForm onSave={onSave} />
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
