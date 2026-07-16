'use client'
import { useEffect, useRef, useState } from 'react'

type PlaybookBreadcrumbProps = {
  activePlaybook: string
  activePlaybookName: string
  memberTeams: { id: string; name: string }[]
  onSelectPlaybook: (id: string) => void
  playName: string
  onOpenFile: () => void
}

/**
 * The top-bar breadcrumb: `[ playbookName ▾ ] / [ playName ]`.
 * Part 1 is a caret dropdown selecting the active playbook ("My Playbook" or a
 * team); Part 2 is a button showing the current play name that opens the file
 * modal. Shared by the desktop `DesignerTopBar` and the mobile top bar.
 */
export function PlaybookBreadcrumb({
  activePlaybook,
  activePlaybookName,
  memberTeams,
  onSelectPlaybook,
  playName,
  onOpenFile,
}: PlaybookBreadcrumbProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function select(id: string) {
    onSelectPlaybook(id)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div ref={containerRef} className="relative flex-none">
        <button
          onClick={() => setOpen((o) => !o)}
          title="Switch playbook"
          className="flex items-center gap-1.5 px-2 h-[30px] rounded-md border border-border text-text hover:border-[#3a4152]"
        >
          <span className="font-display text-[13px] font-semibold uppercase tracking-[.06em] max-w-[40vw] md:max-w-[180px] truncate">
            {activePlaybookName}
          </span>
          <span className="text-text-muted text-xs" aria-hidden>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[180px] rounded-[10px] border border-border bg-surface-raised p-1 shadow-lg flex flex-col">
            <button
              onClick={() => select('personal')}
              className={`px-2.5 py-2 md:py-1.5 min-h-11 md:min-h-0 rounded-md text-left text-sm hover:bg-surface ${
                activePlaybook === 'personal' ? 'text-accent' : 'text-text'
              }`}
            >
              My Playbook
            </button>
            {memberTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => select(team.id)}
                className={`px-2.5 py-2 md:py-1.5 min-h-11 md:min-h-0 rounded-md text-left text-sm truncate hover:bg-surface ${
                  activePlaybook === team.id ? 'text-accent' : 'text-text'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-text-muted flex-none" aria-hidden>
        /
      </span>

      <button
        onClick={onOpenFile}
        title="Open file menu"
        className="min-w-0 px-2 h-[30px] rounded-md border border-border text-sm text-text hover:border-[#3a4152] truncate"
      >
        {playName.trim() || 'Untitled play'}
      </button>
    </div>
  )
}
