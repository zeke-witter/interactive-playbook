'use client'
import { useEffect, useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'
import type { DesignerStep } from '@/types/designer'
import type { Play } from '@/types/play'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<string[]>([])

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
    setSaveStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: designer.category, set: designer.set, steps: designer.steps }),
      })
      const data = await res.json()
      setSaveStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
      if (res.ok) refreshDrafts()
    } catch {
      setSaveStatus('Error: failed to save')
    }
  }

  async function handleLoadDraft(name: string) {
    if (!window.confirm(`Load "${name}"? This will replace your current in-progress work.`)) return
    try {
      const res = await fetch(`/api/designer/drafts/${name}`)
      const data = await res.json()
      if (res.ok) {
        designer.loadDraft(data as { category?: Play['category']; set?: Play['set']; steps: DesignerStep[] })
      }
    } catch {
      // ignore load errors — the toolbar list only ever shows names the server reported
    }
  }

  async function handleDeleteDraft(name: string) {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    await fetch(`/api/designer/drafts/${name}`, { method: 'DELETE' })
    refreshDrafts()
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
        />
        {saveStatus && <p className="text-sm text-text-muted">{saveStatus}</p>}
      </aside>
    </main>
  )
}
