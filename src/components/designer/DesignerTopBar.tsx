'use client'
import { FileSwitcher } from './FileSwitcher'

type DesignerTopBarProps = {
  currentFileName: string | null
  draftNames: string[]
  onSave: (name: string) => void
  onExport: (name: string) => void
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onNewPlay: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPreview: () => void
}

export function DesignerTopBar({
  currentFileName, draftNames, onSave, onExport, onLoadDraft, onDeleteDraft, onNewPlay,
  canUndo, canRedo, onUndo, onRedo, onPreview,
}: DesignerTopBarProps) {
  return (
    <div className="h-[50px] flex-none flex items-center gap-3 px-4 border-b border-border bg-surface-raised">
      <span className="font-display text-[13px] font-semibold uppercase tracking-[.06em] text-text">MOUSETRAP</span>
      <span className="text-text-muted">/</span>
      <FileSwitcher
        currentFileName={currentFileName}
        draftNames={draftNames}
        onSave={onSave}
        onExport={onExport}
        onLoadDraft={onLoadDraft}
        onDeleteDraft={onDeleteDraft}
        onNewPlay={onNewPlay}
      />
      <div className="flex-1" />
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ↺
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ↻
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
