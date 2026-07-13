'use client'
import { useEffect, useRef, useState } from 'react'

type FileSwitcherProps = {
  currentFileName: string | null
  draftNames: string[]
  onSave: (name: string) => void
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onNewPlay: () => void
}

function FileSwitcherFields({
  name, setName, onSave, draftNames, currentFileName, onLoadDraft, onDeleteDraft, onNewPlay,
}: {
  name: string
  setName: (v: string) => void
  onSave: () => void
  draftNames: string[]
  currentFileName: string | null
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onNewPlay: () => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-text-muted">Play Name</span>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 min-h-11 md:min-h-0 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
          />
          <button
            onClick={onSave}
            className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>

      {draftNames.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-text-muted">Drafts</span>
            <div className="flex flex-col gap-1 max-h-48 md:max-h-48 overflow-y-auto">
              {draftNames.map((draft) => {
                const isCurrent = draft === currentFileName
                return (
                  <div
                    key={draft}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md border text-sm ${
                      isCurrent ? 'border-accent' : 'border-border'
                    }`}
                  >
                    <button
                      onClick={() => onLoadDraft(draft)}
                      className="flex-1 min-w-0 truncate text-left text-text hover:text-accent"
                    >
                      {draft}
                    </button>
                    {isCurrent ? (
                      <span className="shrink-0 text-xs text-text-muted">current</span>
                    ) : (
                      <button
                        onClick={() => onDeleteDraft(draft)}
                        className="shrink-0 text-xs text-text-muted hover:text-danger-border"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-border" />
      <button
        onClick={onNewPlay}
        className="min-h-11 md:min-h-0 px-3 py-1.5 rounded-md border border-dashed border-accent text-accent text-sm"
      >
        + New Play
      </button>
    </>
  )
}

export function FileSwitcher({ currentFileName, draftNames, onSave, onLoadDraft, onDeleteDraft, onNewPlay }: FileSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentFileName ?? '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setName(currentFileName ?? '')
  }, [currentFileName])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSave() {
    if (name.trim()) onSave(name.trim())
  }

  function handleLoadDraft(draft: string) {
    onLoadDraft(draft)
    setOpen(false)
  }

  function handleNewPlay() {
    onNewPlay()
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-sm text-text hover:border-[#3a4152]"
      >
        {currentFileName ?? 'Untitled'}
        <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Desktop: popover anchored below the chip */}
          <div className="hidden md:flex absolute left-0 top-[calc(100%+8px)] z-30 w-[280px] rounded-[10px] border border-border bg-surface-raised p-4 shadow-lg flex-col gap-3">
            <FileSwitcherFields
              name={name}
              setName={setName}
              onSave={handleSave}
              draftNames={draftNames}
              currentFileName={currentFileName}
              onLoadDraft={handleLoadDraft}
              onDeleteDraft={onDeleteDraft}
              onNewPlay={handleNewPlay}
            />
          </div>

          {/* Mobile: full-height drawer, same pattern as the Viewer's play picker */}
          <div className="md:hidden fixed inset-0 z-30 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative w-72 max-w-[80vw] h-full bg-bg border-l border-border p-4 overflow-y-auto flex flex-col gap-3">
              <button onClick={() => setOpen(false)} className="min-h-11 flex items-center mb-1 text-text-muted hover:text-text self-start">
                ✕ Close
              </button>
              <FileSwitcherFields
                name={name}
                setName={setName}
                onSave={handleSave}
                draftNames={draftNames}
                currentFileName={currentFileName}
                onLoadDraft={handleLoadDraft}
                onDeleteDraft={onDeleteDraft}
                onNewPlay={handleNewPlay}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
