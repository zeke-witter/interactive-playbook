'use client'
import type { DesignerStep, StepPath } from '@/types/designer'

type StepTreeProps = {
  steps: DesignerStep[]
  pathPrefix: StepPath
  currentPath: StepPath
  onSelect: (path: StepPath) => void
  onDelete: (path: StepPath) => void
  onRemoveBranch: (stepPath: StepPath, branchIndex: number) => void
  depth: number
}

export function StepTree({ steps, pathPrefix, currentPath, onSelect, onDelete, onRemoveBranch, depth }: StepTreeProps) {
  return (
    <div className="relative flex flex-col gap-1" style={{ marginLeft: depth * 12 }}>
      {steps.length > 1 && <div className="absolute left-[7px] top-[14px] bottom-[14px] w-px bg-border" />}
      {steps.map((step, i) => {
        const path = [...pathPrefix, i]
        const isCurrent = path.length === currentPath.length && path.every((v, idx) => v === currentPath[idx])
        const isEmptyFirstStep = depth === 0 && i === 0 && steps.length === 1 && !step.branches
        return (
          <div key={i} className="flex flex-col gap-1">
            {isEmptyFirstStep ? (
              <div className="rounded-md border border-dashed border-accent bg-surface-raised px-3 py-2.5 text-center">
                <p className="text-sm text-text">Step 1</p>
                <p className="mt-1 text-xs text-text-muted">This is where it starts, add a step once you&apos;re happy with the setup</p>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 pl-4">
                <span
                  className={`absolute left-0 w-[7px] h-[7px] rounded-full border ${
                    isCurrent ? 'bg-accent border-accent' : 'bg-surface border-border'
                  }`}
                />
                <button
                  onClick={() => onSelect(path)}
                  className={`flex-1 min-h-11 md:min-h-0 text-left px-2 py-1 rounded-md border text-sm transition-colors ${
                    isCurrent ? 'border-accent text-accent' : 'border-border text-text hover:border-[#3a4152]'
                  }`}
                >
                  Step {i + 1}
                </button>
                {steps.length > 1 && (
                  <button onClick={() => {
                    const hasBranches = step.branches && step.branches.length > 0
                    const message = hasBranches ? 'Delete this step and all its branches?' : 'Delete this step?'
                    if (window.confirm(message)) {
                      onDelete(path)
                    }
                  }} className="min-h-11 md:min-h-0 px-2 text-xs text-text-muted hover:text-danger-border">
                    Remove
                  </button>
                )}
              </div>
            )}
            {step.branches?.map((branch, b) => (
              <div key={b} className="flex flex-col gap-1" style={{ marginLeft: 12 }}>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{branch.label}</span>
                  <button onClick={() => {
                    if (window.confirm('Delete this branch and everything in it?')) {
                      onRemoveBranch(path, b)
                    }
                  }} className="min-h-11 md:min-h-0 flex items-center hover:text-danger-border">
                    Remove Branch
                  </button>
                </div>
                <StepTree
                  steps={branch.steps}
                  pathPrefix={[...path, b]}
                  currentPath={currentPath}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRemoveBranch={onRemoveBranch}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
