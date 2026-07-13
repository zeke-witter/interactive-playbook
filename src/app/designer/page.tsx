'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'
import { DesignerPreview } from '@/components/designer/DesignerPreview'
import { DesignerTopBar } from '@/components/designer/DesignerTopBar'
import { ToolRail } from '@/components/designer/ToolRail'
import { DesignerSidePanel } from '@/components/designer/DesignerSidePanel'
import type { Play } from '@/types/play'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [status, setStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)

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
        <DesignerPreview steps={designer.steps} set={designer.set} onExit={() => setIsPreviewing(false)} />
      </main>
    )
  }

  return (
    <main className="h-screen overflow-hidden bg-bg">
      {/* Mobile layout — unchanged pending its own dedicated redesign pass */}
      <div className="md:hidden flex flex-col h-full">
        <div className="w-full h-full p-4">
          <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
            <DesignerCanvas designer={designer} />
          </div>
        </div>
        <aside className="w-full flex flex-col gap-4 p-4 overflow-y-auto">
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Play Designer</h1>
          <DesignerToolbar
            designer={designer}
            onSave={handleSave}
            draftNames={draftNames}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={handleDeleteDraft}
            onPreview={() => setIsPreviewing(true)}
          />
          {status && <p className="text-sm text-text-muted">{status}</p>}
        </aside>
      </div>

      {/* Desktop layout — whiteboarding-tool structure: top bar, tool rail, canvas, formation/steps panel */}
      <div className="hidden md:flex flex-col h-full">
        <DesignerTopBar
          currentFileName={currentFileName}
          draftNames={draftNames}
          onSave={handleSave}
          onLoadDraft={handleLoadDraft}
          onDeleteDraft={handleDeleteDraft}
          onNewPlay={handleNewPlay}
          canUndo={designer.canUndo}
          canRedo={designer.canRedo}
          onUndo={designer.undo}
          onRedo={designer.redo}
          onPreview={() => setIsPreviewing(true)}
        />
        <div className="flex-1 min-h-0 flex">
          <ToolRail mode={designer.mode} onSelect={designer.setMode} />
          <div className="flex-1 min-w-0 flex items-center justify-center p-6 bg-[#0d0f13]">
            <div className="relative h-full aspect-[5/6] max-w-full rounded-xl border border-border bg-surface overflow-hidden">
              <DesignerCanvas designer={designer} />
            </div>
          </div>
          <DesignerSidePanel designer={designer} />
        </div>
        {status && <p className="flex-none px-4 py-2 text-sm text-text-muted border-t border-border">{status}</p>}
      </div>
    </main>
  )
}
