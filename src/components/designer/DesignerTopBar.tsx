'use client'
import { FileSwitcher } from './FileSwitcher'
import type { Play } from '@/types/play'

type DesignerTopBarProps = {
  currentFileName: string | null
  draftNames: string[]
  existingPlays: Play[]
  publishedPlayId: string | null
  onSave: (name: string) => void
  onExport: (name: string) => void
  onPublish: (name: string) => void
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onLoadExistingPlay: (play: Play) => void
  onNewPlay: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPreview: () => void
}

export function DesignerTopBar({
  currentFileName, draftNames, existingPlays, publishedPlayId, onSave, onExport, onPublish,
  onLoadDraft, onDeleteDraft, onLoadExistingPlay, onNewPlay,
  canUndo, canRedo, onUndo, onRedo, onPreview,
}: DesignerTopBarProps) {
  return (
    <div className="h-[50px] flex-none flex items-center gap-3 px-4 border-b border-border bg-surface-raised">
      <span className="font-display text-[13px] font-semibold uppercase tracking-[.06em] text-text">MOUSETRAP</span>
      <span className="text-text-muted">/</span>
      <FileSwitcher
        currentFileName={currentFileName}
        draftNames={draftNames}
        existingPlays={existingPlays}
        publishedPlayId={publishedPlayId}
        onSave={onSave}
        onExport={onExport}
        onPublish={onPublish}
        onLoadDraft={onLoadDraft}
        onDeleteDraft={onDeleteDraft}
        onLoadExistingPlay={onLoadExistingPlay}
        onNewPlay={onNewPlay}
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
