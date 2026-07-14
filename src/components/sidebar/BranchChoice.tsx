import type { PlayBranch, Position } from '@/types/play'
import { substituteNames } from '@/lib/names'

export function BranchChoice({ branches, onChoose, roster }: { branches: PlayBranch[]; onChoose: (branch: PlayBranch) => void; roster: Record<Position, string> }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">What happens next?</p>
      {branches.map((branch) => (
        <button
          key={branch.id}
          onClick={() => onChoose(branch)}
          className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-left text-text hover:bg-surface-raised hover:border-accent transition-colors"
        >
          {substituteNames(branch.label, roster)}
        </button>
      ))}
    </div>
  )
}
