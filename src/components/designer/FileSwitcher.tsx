'use client'
import { useEffect, useRef, useState } from 'react'
import type { Play } from '@/types/play'

// The starting-point catalog ("Load Existing Play") lists the plays that ship
// with the app as scaffolding to author from. Kept dev-only, as before.
const CAN_LOAD_STARTER_PLAYS = process.env.NODE_ENV === 'development'

type FileSwitcherProps = {
  currentFileName: string | null
  draftNames: string[]
  existingPlays: Play[]
  publishedPlayId: string | null
  signedIn: boolean
  manageableTeams: { id: string; name: string }[]
  onSave: (name: string) => void
  onExport: (name: string) => void
  onPublish: (name: string, destination: string) => void
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onLoadExistingPlay: (play: Play) => void
  onNewPlay: () => void
  onSignIn: () => void
}

function FileSwitcherFields({
  name, setName, onSave, onExport, onPublish, draftNames, currentFileName, onLoadDraft, onDeleteDraft,
  existingPlays, publishedPlayId, onLoadExistingPlay, onNewPlay,
  signedIn, manageableTeams, destination, setDestination, onSignIn,
}: {
  name: string
  setName: (v: string) => void
  onSave: () => void
  onExport: () => void
  onPublish: () => void
  draftNames: string[]
  currentFileName: string | null
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  existingPlays: Play[]
  publishedPlayId: string | null
  onLoadExistingPlay: (play: Play) => void
  onNewPlay: () => void
  signedIn: boolean
  manageableTeams: { id: string; name: string }[]
  destination: string
  setDestination: (v: string) => void
  onSignIn: () => void
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
          {signedIn && (
            <button
              onClick={onSave}
              title="Save a private draft you can reopen later"
              className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm font-medium"
            >
              Save
            </button>
          )}
        </div>
        {signedIn ? (
          manageableTeams.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex-1 min-w-0 min-h-11 md:min-h-0 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
              >
                <option value="personal">My playbook</option>
                {manageableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onPublish}
                title="Publish to the selected playbook"
                className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-success-border text-success-border text-sm"
              >
                Publish
              </button>
            </div>
          ) : (
            <button
              onClick={onPublish}
              title="Save to your personal playbook"
              className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-success-border text-success-border text-sm"
            >
              Save to my playbook
            </button>
          )
        ) : (
          <button
            onClick={onSignIn}
            className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm font-medium"
          >
            Sign in to save
          </button>
        )}
        <button
          onClick={onExport}
          className="min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-border text-text text-sm"
        >
          Export to File
        </button>
      </div>

      {CAN_LOAD_STARTER_PLAYS && existingPlays.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-text-muted">Load Existing Play</span>
            <div className="flex flex-col gap-1 max-h-48 md:max-h-48 overflow-y-auto">
              {existingPlays.map((play) => {
                const isCurrent = play.id === publishedPlayId
                return (
                  <div
                    key={play.id}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md border text-sm ${
                      isCurrent ? 'border-accent' : 'border-border'
                    }`}
                  >
                    <button
                      onClick={() => onLoadExistingPlay(play)}
                      className="flex-1 min-w-0 truncate text-left text-text hover:text-accent"
                    >
                      {play.name}
                    </button>
                    {isCurrent && <span className="shrink-0 text-xs text-text-muted">current</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

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

export function FileSwitcher({
  currentFileName, draftNames, existingPlays, publishedPlayId, onSave, onExport, onPublish,
  onLoadDraft, onDeleteDraft, onLoadExistingPlay, onNewPlay,
  signedIn, manageableTeams, onSignIn,
}: FileSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentFileName ?? '')
  const [destination, setDestination] = useState('personal')
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

  function handleExport() {
    if (name.trim()) onExport(name.trim())
  }

  function handlePublish() {
    if (name.trim()) onPublish(name.trim(), destination)
  }

  function handleLoadDraft(draft: string) {
    onLoadDraft(draft)
    setOpen(false)
  }

  function handleLoadExistingPlay(play: Play) {
    onLoadExistingPlay(play)
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
              onExport={handleExport}
              onPublish={handlePublish}
              draftNames={draftNames}
              currentFileName={currentFileName}
              onLoadDraft={handleLoadDraft}
              onDeleteDraft={onDeleteDraft}
              existingPlays={existingPlays}
              publishedPlayId={publishedPlayId}
              onLoadExistingPlay={handleLoadExistingPlay}
              onNewPlay={handleNewPlay}
              signedIn={signedIn}
              manageableTeams={manageableTeams}
              destination={destination}
              setDestination={setDestination}
              onSignIn={onSignIn}
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
                onExport={handleExport}
                onPublish={handlePublish}
                draftNames={draftNames}
                currentFileName={currentFileName}
                onLoadDraft={handleLoadDraft}
                onDeleteDraft={onDeleteDraft}
                existingPlays={existingPlays}
                publishedPlayId={publishedPlayId}
                onLoadExistingPlay={handleLoadExistingPlay}
                onNewPlay={handleNewPlay}
                signedIn={signedIn}
                manageableTeams={manageableTeams}
                destination={destination}
                setDestination={setDestination}
                onSignIn={onSignIn}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
