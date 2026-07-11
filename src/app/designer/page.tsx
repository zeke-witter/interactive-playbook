'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'
import { DesignerPreview } from '@/components/designer/DesignerPreview'
import type { Play } from '@/types/play'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [status, setStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)

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
      if (res.ok) refreshDrafts()
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

  if (isPreviewing) {
    return (
      <main className="flex h-screen bg-bg p-4">
        <DesignerPreview steps={designer.steps} set={designer.set} onExit={() => setIsPreviewing(false)} />
      </main>
    )
  }

  return (
    <main className="flex flex-col md:flex-row h-screen bg-bg">
      <div className="w-full md:w-[65%] h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <DesignerCanvas designer={designer} />
        </div>
      </div>
      <aside className="w-full md:w-[35%] flex flex-col gap-4 p-4 overflow-y-auto">
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
    </main>
  )
}
