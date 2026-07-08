import type { PlayBranch } from '@/types/play'

export function BranchChoice({ branches, onChoose }: { branches: PlayBranch[]; onChoose: (branch: PlayBranch) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-500">What happens next?</p>
      {branches.map((branch) => (
        <button
          key={branch.id}
          onClick={() => onChoose(branch)}
          className="rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
        >
          {branch.label}
        </button>
      ))}
    </div>
  )
}
