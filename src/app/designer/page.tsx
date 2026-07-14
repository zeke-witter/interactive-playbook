'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerPreview } from '@/components/designer/DesignerPreview'
import { DesignerTopBar } from '@/components/designer/DesignerTopBar'
import { ToolRail } from '@/components/designer/ToolRail'
import { DesignerSidePanel } from '@/components/designer/DesignerSidePanel'
import { FileSwitcher } from '@/components/designer/FileSwitcher'
import { MobileToolTabBar } from '@/components/designer/MobileToolTabBar'
import { MobileStepSheet } from '@/components/designer/MobileStepSheet'
import { CoachMark } from '@/components/designer/CoachMark'
import type { Play } from '@/types/play'
import { sanitizeSlug } from '@/lib/slug'
import { ALL_PLAYS } from '@/data/plays'

const COACH_MARK_KEY = 'mousetrap-designer-coachmark-dismissed'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [status, setStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const [coachDismissed, setCoachDismissed] = useState(true)

  useEffect(() => {
    setCoachDismissed(localStorage.getItem(COACH_MARK_KEY) === '1')
  }, [])

  function dismissCoachMark() {
    localStorage.setItem(COACH_MARK_KEY, '1')
    setCoachDismissed(true)
  }

  const showCoachMark = !coachDismissed && designer.mode === 'position'
    && designer.steps.length === 1 && !designer.steps[0].branches

  async function refreshDrafts() {
    try {
      const res = await fetch('/api/designer/drafts')
      const data = await res.json()
      setDraftNames(Array.isArray(data.drafts) ? data.drafts : [])
    } catch {
      setDraftNames([])
    }
  }

  useEffect(() => {
    refreshDrafts()
  }, [])

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

  async function handleSave(name: string) {
    setStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: designer.category, set: designer.set, steps: designer.steps }),
      })
      const data = await res.json()
      setStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
      if (res.ok) {
        refreshDrafts()
        setCurrentFileName(name)
      }
    } catch {
      setStatus('Error: failed to save')
    }
  }

  function handleExport(name: string) {
    const data = { name, category: designer.category, set: designer.set, steps: designer.steps }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeSlug(name)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePublish(name: string) {
    setStatus('Publishing...')
    try {
      const res = await fetch('/api/designer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: designer.publishedPlayId,
          name,
          category: designer.category,
          set: designer.set,
          description: designer.description,
          steps: designer.steps,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }
      designer.markPublished(data.id)
      setCurrentFileName(name)
      setStatus(data.isNew ? `Published new play "${data.id}"` : `Published (updated "${data.id}")`)
    } catch {
      setStatus('Error: failed to publish')
    }
  }

  function handleLoadExistingPlay(play: Play) {
    if (!window.confirm(`Load "${play.name}"? This will replace your current in-progress work.`)) return
    designer.loadExistingPlay(play)
    setCurrentFileName(play.name)
    setStatus(`Loaded "${play.name}" from the published catalog`)
  }

  async function handleLoadDraft(name: string) {
    if (!window.confirm(`Load "${name}"? This will replace your current in-progress work.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`)
      const data = await res.json()
      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }
      const applied = designer.loadDraft(data as { category?: Play['category']; set?: Play['set']; steps?: unknown })
      setStatus(applied ? `Loaded ${name}` : `Error: "${name}" is not a valid draft file`)
      if (applied) setCurrentFileName(name)
    } catch {
      setStatus('Error: failed to load draft')
    }
  }

  async function handleDeleteDraft(name: string) {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`, { method: 'DELETE' })
      const data = await res.json()
      setStatus(res.ok ? `Deleted ${name}` : `Error: ${data.error}`)
      refreshDrafts()
    } catch {
      setStatus('Error: failed to delete draft')
    }
  }

  function handleNewPlay() {
    if (window.confirm('Start a new play? This clears everything on the canvas (Undo will bring it back if you change your mind).')) {
      designer.newPlay()
      setCurrentFileName(null)
    }
  }

  if (isPreviewing) {
    return (
      <main className="flex flex-col h-screen bg-bg p-4">
        <DesignerPreview steps={designer.steps} category={designer.category} set={designer.set} onExit={() => setIsPreviewing(false)} />
      </main>
    )
  }

  return (
    <main className="h-screen overflow-hidden bg-bg">
      {/* Mobile layout — bottom tab bar + swipe-up step sheet, mirroring the desktop shell */}
      <div className="md:hidden relative h-full">
        <div className="h-[46px] flex-none flex items-center gap-2 px-3 border-b border-border bg-surface-raised">
          <FileSwitcher
            currentFileName={currentFileName}
            draftNames={draftNames}
            existingPlays={ALL_PLAYS}
            publishedPlayId={designer.publishedPlayId}
            onSave={handleSave}
            onExport={handleExport}
            onPublish={handlePublish}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={handleDeleteDraft}
            onLoadExistingPlay={handleLoadExistingPlay}
            onNewPlay={handleNewPlay}
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
          currentFileName={currentFileName}
          draftNames={draftNames}
          existingPlays={ALL_PLAYS}
          publishedPlayId={designer.publishedPlayId}
          onSave={handleSave}
          onExport={handleExport}
          onPublish={handlePublish}
          onLoadDraft={handleLoadDraft}
          onDeleteDraft={handleDeleteDraft}
          onLoadExistingPlay={handleLoadExistingPlay}
          onNewPlay={handleNewPlay}
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
        {status && <p className="flex-none px-4 py-2 text-sm text-text-muted border-t border-border">{status}</p>}
      </div>
    </main>
  )
}
