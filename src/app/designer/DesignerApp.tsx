'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerPreview } from '@/components/designer/DesignerPreview'
import { DesignerTopBar } from '@/components/designer/DesignerTopBar'
import { ToolRail } from '@/components/designer/ToolRail'
import { DesignerSidePanel } from '@/components/designer/DesignerSidePanel'
import { FileModal } from '@/components/designer/FileModal'
import { PlaybookBreadcrumb } from '@/components/designer/PlaybookBreadcrumb'
import { MobileToolTabBar } from '@/components/designer/MobileToolTabBar'
import { MobileStepSheet } from '@/components/designer/MobileStepSheet'
import { CoachMark } from '@/components/designer/CoachMark'
import type { Play } from '@/types/play'
import type { CurrentProfile } from '@/lib/supabase/server'
import type { MemberTeam } from '@/lib/playsRepo'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { sanitizeSlug } from '@/lib/slug'
import { saveDraft, loadDraft, deleteDraft, publishPersonalPlay, publishTeamPlay } from './actions'

const COACH_MARK_KEY = 'mousetrap-designer-coachmark-dismissed'

type DesignerAppProps = {
  profile: CurrentProfile | null
  memberTeams: MemberTeam[]
  personalPlays: Play[]
  teamPlays: Record<string, Play[]>
  starterPlays: Play[]
  draftList: { name: string; scope: string }[]
  initialPlay: Play | null
  initialScope: string
}

export function DesignerApp({
  profile,
  memberTeams,
  personalPlays,
  teamPlays,
  starterPlays,
  draftList,
  initialPlay,
  initialScope,
}: DesignerAppProps) {
  const designer = useDesignerState()
  const router = useRouter()
  const signedIn = profile !== null
  const [status, setStatus] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  // The editable play name (breadcrumb part 2 + modal input).
  const [playName, setPlayName] = useState('')
  // The identity of the last loaded/saved file, for the drafts "current" highlight.
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  // The active playbook context: 'personal' or a team id.
  const [activePlaybook, setActivePlaybook] = useState<string>(initialScope)
  const [coachDismissed, setCoachDismissed] = useState(true)
  const loadedInitialRef = useRef(false)

  useEffect(() => {
    setCoachDismissed(localStorage.getItem(COACH_MARK_KEY) === '1')
  }, [])

  // Open an existing play into the editor exactly once on mount.
  useEffect(() => {
    if (loadedInitialRef.current || !initialPlay) return
    loadedInitialRef.current = true
    designer.loadExistingPlay(initialPlay)
    setPlayName(initialPlay.name)
    setCurrentFileName(initialPlay.name)
  }, [initialPlay, designer])

  // --- Active-playbook derivations ---
  const activeTeam = memberTeams.find((t) => t.id === activePlaybook)
  const loadablePlays = activePlaybook === 'personal' ? personalPlays : (teamPlays[activePlaybook] ?? [])
  const activeDrafts = useMemo(
    () => draftList.filter((d) => d.scope === activePlaybook),
    [draftList, activePlaybook],
  )
  const canPublishHere = activePlaybook === 'personal' ? !!profile : !!activeTeam?.canPublish
  const activePlaybookName = activePlaybook === 'personal' ? 'My Playbook' : (activeTeam?.name ?? 'Playbook')

  function dismissCoachMark() {
    localStorage.setItem(COACH_MARK_KEY, '1')
    setCoachDismissed(true)
  }

  const showCoachMark =
    !coachDismissed &&
    designer.mode === 'position' &&
    designer.steps.length === 1 &&
    !designer.steps[0].branches

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (isTyping || isPreviewing) return
      const meta = e.metaKey || e.ctrlKey
      if (!meta || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) {
        designer.redo()
      } else {
        designer.undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [designer, isPreviewing])

  function handleSignIn() {
    const supabase = getBrowserSupabase()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/designer` },
    })
  }

  async function handleSave() {
    const name = playName.trim()
    if (!name) {
      setStatus('Name the play first.')
      return
    }
    setStatus('Saving...')
    try {
      const result = await saveDraft(
        name,
        {
          category: designer.category,
          set: designer.set,
          description: designer.description,
          steps: designer.steps,
        },
        activePlaybook,
      )
      if (result.error) {
        setStatus(`Error: ${result.error}`)
        return
      }
      setStatus(`Saved draft "${name}"`)
      setCurrentFileName(name)
      router.refresh()
    } catch {
      setStatus('Error: failed to save')
    }
  }

  function handleExport() {
    const name = playName.trim() || 'untitled-play'
    const data = { name, category: designer.category, set: designer.set, steps: designer.steps }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeSlug(name)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePublish() {
    if (!canPublishHere) return
    const name = playName.trim()
    if (!name) {
      setStatus('Name the play first.')
      return
    }
    const toPersonal = activePlaybook === 'personal'
    setStatus(toPersonal ? 'Saving...' : 'Publishing...')
    try {
      const session = {
        name,
        category: designer.category,
        set: designer.set,
        description: designer.description,
        steps: designer.steps,
        slug: designer.publishedPlayId ?? undefined,
      }
      const result = toPersonal
        ? await publishPersonalPlay(session)
        : await publishTeamPlay(activePlaybook, session)
      if (result.error) {
        setStatus(`Error: ${result.error}`)
        return
      }
      if (result.slug) designer.markPublished(result.slug)
      setCurrentFileName(name)
      setStatus(toPersonal ? 'Saved to your playbook' : `Published to ${activePlaybookName}`)
      router.refresh()
    } catch {
      setStatus('Error: failed to publish')
    }
  }

  function handleLoadExistingPlay(play: Play) {
    if (!window.confirm(`Load "${play.name}"? This will replace your current in-progress work.`)) return
    designer.loadExistingPlay(play)
    setPlayName(play.name)
    setCurrentFileName(play.name)
    setStatus(`Loaded "${play.name}"`)
    setFileModalOpen(false)
  }

  async function handleLoadDraft(name: string) {
    if (!window.confirm(`Load "${name}"? This will replace your current in-progress work.`)) return
    try {
      const res = await loadDraft(name)
      if (res.error || !res.draft) {
        setStatus(`Error: ${res.error ?? 'Draft not found.'}`)
        return
      }
      const applied = designer.loadDraft(res.draft)
      if (applied) {
        setPlayName(name)
        setCurrentFileName(name)
        setStatus(`Loaded ${name}`)
        setFileModalOpen(false)
      } else {
        setStatus(`Error: "${name}" is not a valid draft file`)
      }
    } catch {
      setStatus('Error: failed to load draft')
    }
  }

  async function handleDeleteDraft(name: string) {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    try {
      const result = await deleteDraft(name)
      setStatus(result.error ? `Error: ${result.error}` : `Deleted ${name}`)
      router.refresh()
    } catch {
      setStatus('Error: failed to delete draft')
    }
  }

  function handleNewPlay() {
    if (
      window.confirm(
        'Start a new play? This clears everything on the canvas (Undo will bring it back if you change your mind).',
      )
    ) {
      designer.newPlay()
      setPlayName('')
      setCurrentFileName(null)
      setFileModalOpen(false)
    }
  }

  if (isPreviewing) {
    return (
      <main className="flex flex-col h-full bg-bg p-4">
        <DesignerPreview
          steps={designer.steps}
          category={designer.category}
          set={designer.set}
          onExit={() => setIsPreviewing(false)}
        />
      </main>
    )
  }

  return (
    <main className="h-full overflow-hidden bg-bg">
      {/* Mobile layout — bottom tab bar + swipe-up step sheet, mirroring the desktop shell */}
      <div className="md:hidden relative h-full">
        <div className="h-[46px] flex-none flex items-center gap-2 px-3 border-b border-border bg-surface-raised">
          <PlaybookBreadcrumb
            activePlaybook={activePlaybook}
            activePlaybookName={activePlaybookName}
            memberTeams={memberTeams}
            onSelectPlaybook={setActivePlaybook}
            playName={playName}
            onOpenFile={() => setFileModalOpen(true)}
          />
          <div className="flex-1" />
          <button
            onClick={designer.undo}
            disabled={!designer.canUndo}
            title="Undo"
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↺
          </button>
          <button
            onClick={designer.redo}
            disabled={!designer.canRedo}
            title="Redo"
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↻
          </button>
          <button
            onClick={() => setIsPreviewing(true)}
            className="h-7 px-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium"
          >
            ▶
          </button>
        </div>

        <div className="absolute top-[46px] left-0 right-0 bottom-0 pb-[126px] p-3 bg-[#0d0f13]">
          {status && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-surface-raised/95 border border-accent text-xs text-text whitespace-nowrap">
              {status}
            </div>
          )}
          <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
            <DesignerCanvas designer={designer} onPositionDragComplete={dismissCoachMark} />
          </div>
        </div>

        {showCoachMark && <CoachMark variant="mobile" />}

        <MobileStepSheet designer={designer} />
        <MobileToolTabBar mode={designer.mode} onSelect={designer.setMode} />
      </div>

      {/* Desktop layout — whiteboarding-tool structure: top bar, tool rail, canvas, formation/steps panel */}
      <div className="hidden md:flex flex-col h-full">
        <DesignerTopBar
          activePlaybook={activePlaybook}
          activePlaybookName={activePlaybookName}
          memberTeams={memberTeams}
          onSelectPlaybook={setActivePlaybook}
          playName={playName}
          onOpenFile={() => setFileModalOpen(true)}
          canUndo={designer.canUndo}
          canRedo={designer.canRedo}
          onUndo={designer.undo}
          onRedo={designer.redo}
          onPreview={() => setIsPreviewing(true)}
        />
        <div className="relative flex-1 min-h-0 flex">
          <ToolRail mode={designer.mode} onSelect={designer.setMode} />
          <div className="flex-1 min-w-0 flex items-center justify-center p-6 bg-[#0d0f13]">
            <div className="relative h-full aspect-[5/6] max-w-full rounded-xl border border-border bg-surface overflow-hidden">
              <DesignerCanvas designer={designer} onPositionDragComplete={dismissCoachMark} />
            </div>
          </div>
          <DesignerSidePanel designer={designer} />
          {showCoachMark && <CoachMark variant="desktop" />}
        </div>
        {status && (
          <p className="flex-none px-4 py-2 text-sm text-text-muted border-t border-border">{status}</p>
        )}
      </div>

      {/* File-management modal, opened from the breadcrumb play-name button (both layouts) */}
      <FileModal
        open={fileModalOpen}
        onClose={() => setFileModalOpen(false)}
        name={playName}
        setName={setPlayName}
        signedIn={signedIn}
        canPublishHere={canPublishHere}
        loadablePlays={loadablePlays}
        starterPlays={starterPlays}
        publishedPlayId={designer.publishedPlayId}
        activeDrafts={activeDrafts}
        currentFileName={currentFileName}
        onSave={handleSave}
        onExport={handleExport}
        onPublish={handlePublish}
        onLoadExistingPlay={handleLoadExistingPlay}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
        onNewPlay={handleNewPlay}
        onSignIn={handleSignIn}
      />
    </main>
  )
}
