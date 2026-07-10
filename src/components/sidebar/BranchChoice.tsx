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
