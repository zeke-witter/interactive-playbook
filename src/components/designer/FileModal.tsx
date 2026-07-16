'use client'
import type { Play } from '@/types/play'

type FileModalProps = {
  open: boolean
  onClose: () => void
  name: string
  setName: (v: string) => void
  signedIn: boolean
  canPublishHere: boolean
  loadablePlays: Play[]
  starterPlays: Play[]
  publishedPlayId: string | null
  activeDrafts: { name: string; scope: string }[]
  currentFileName: string | null
  onSave: () => void
  onExport: () => void
  onPublish: () => void
  onLoadExistingPlay: (play: Play) => void
  onLoadDraft: (name: string) => void
  onDeleteDraft: (name: string) => void
  onNewPlay: () => void
  onSignIn: () => void
}

/**
 * Centered file-management modal, opened from the breadcrumb's play-name button.
 * Holds everything the old inline `FileSwitcher` panel did — name input, save /
 * add-to-playbook / export, "Load existing play" (+ starter templates), drafts,
 * and New Play — scoped to the active playbook by the props DesignerApp derives.
 * Backdrop click closes; works on mobile + desktop.
 */
export function FileModal({
  open,
  onClose,
  name,
  setName,
  signedIn,
  canPublishHere,
  loadablePlays,
  starterPlays,
  publishedPlayId,
  activeDrafts,
  currentFileName,
  onSave,
  onExport,
  onPublish,
  onLoadExistingPlay,
  onLoadDraft,
  onDeleteDraft,
  onNewPlay,
  onSignIn,
}: FileModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-surface-raised p-4 flex flex-col gap-3 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted">File</span>
          <button
            onClick={onClose}
            className="min-h-11 md:min-h-0 flex items-center text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        {/* Play name + primary actions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-muted">Play Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled play"
            className="w-full min-h-11 md:min-h-0 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
          />
          {signedIn ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={onSave}
                  title="Save a private draft you can reopen later"
                  className="flex-1 min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-accent bg-accent text-accent-foreground text-sm font-medium"
                >
                  Save draft
                </button>
                <button
                  onClick={onPublish}
                  disabled={!canPublishHere}
                  title={canPublishHere ? 'Add this play to the active playbook' : 'Captains can publish here'}
                  className="flex-1 min-h-11 md:min-h-0 px-3 py-1 rounded-md border border-success-border text-success-border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add to playbook
                </button>
              </div>
              {!canPublishHere && (
                <span className="text-xs text-text-muted">Captains can publish here.</span>
              )}
            </>
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

        {/* Load existing play (active playbook) + starter templates */}
        <div className="border-t border-border" />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-muted">Load Existing Play</span>
          {loadablePlays.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {loadablePlays.map((play) => {
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
          ) : (
            <span className="text-xs text-text-muted">No plays in this playbook yet.</span>
          )}

          {starterPlays.length > 0 && (
            <>
              <span className="mt-1 text-xs uppercase tracking-wide text-text-muted">Starter Templates</span>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {starterPlays.map((play) => (
                  <div
                    key={`starter-${play.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md border border-border text-sm"
                  >
                    <button
                      onClick={() => onLoadExistingPlay(play)}
                      className="flex-1 min-w-0 truncate text-left text-text hover:text-accent"
                    >
                      {play.name}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Drafts (active playbook) */}
        {activeDrafts.length > 0 && (
          <>
            <div className="border-t border-border" />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-text-muted">Drafts</span>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {activeDrafts.map((draft) => {
                  const isCurrent = draft.name === currentFileName
                  return (
                    <div
                      key={draft.name}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md border text-sm ${
                        isCurrent ? 'border-accent' : 'border-border'
                      }`}
                    >
                      <button
                        onClick={() => onLoadDraft(draft.name)}
                        className="flex-1 min-w-0 truncate text-left text-text hover:text-accent"
                      >
                        {draft.name}
                      </button>
                      {isCurrent ? (
                        <span className="shrink-0 text-xs text-text-muted">current</span>
                      ) : (
                        <button
                          onClick={() => onDeleteDraft(draft.name)}
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
      </div>
    </div>
  )
}
