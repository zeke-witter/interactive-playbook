'use client'
import { PlaybookBreadcrumb } from './PlaybookBreadcrumb'

type DesignerTopBarProps = {
  activePlaybook: string
  activePlaybookName: string
  memberTeams: { id: string; name: string }[]
  onSelectPlaybook: (id: string) => void
  playName: string
  onOpenFile: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPreview: () => void
}

export function DesignerTopBar({
  activePlaybook,
  activePlaybookName,
  memberTeams,
  onSelectPlaybook,
  playName,
  onOpenFile,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
}: DesignerTopBarProps) {
  return (
    <div className="h-[50px] flex-none flex items-center gap-3 px-4 border-b border-border bg-surface-raised">
      <PlaybookBreadcrumb
        activePlaybook={activePlaybook}
        activePlaybookName={activePlaybookName}
        memberTeams={memberTeams}
        onSelectPlaybook={onSelectPlaybook}
        playName={playName}
        onOpenFile={onOpenFile}
      />
      <div className="flex-1" />
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        className="h-[30px] min-w-[30px] px-1.5 lg:px-2.5 flex items-center justify-center gap-1.5 rounded-md border border-border text-text text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden>↺</span>
        <span className="hidden lg:inline">Undo</span>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className="h-[30px] min-w-[30px] px-1.5 lg:px-2.5 flex items-center justify-center gap-1.5 rounded-md border border-border text-text text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden>↻</span>
        <span className="hidden lg:inline">Redo</span>
      </button>
      <div className="w-px h-6 bg-border" />
      <button
        onClick={onPreview}
        className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium"
      >
        ▶ Preview
      </button>
    </div>
  )
}
