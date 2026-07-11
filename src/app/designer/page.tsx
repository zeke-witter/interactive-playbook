'use client'
import { useState } from 'react'
import { useDesignerState } from '@/hooks/useDesignerState'
import { DesignerCanvas } from '@/components/designer/DesignerCanvas'
import { DesignerToolbar } from '@/components/designer/DesignerToolbar'

export default function DesignerPage() {
  const designer = useDesignerState()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  async function handleSave(name: string) {
    setSaveStatus('Saving...')
    try {
      const res = await fetch('/api/designer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps: designer.steps }),
      })
      const data = await res.json()
      setSaveStatus(res.ok ? `Saved to ${data.path}` : `Error: ${data.error}`)
    } catch {
      setSaveStatus('Error: failed to save')
    }
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
        <DesignerToolbar designer={designer} onSave={handleSave} />
        {saveStatus && <p className="text-sm text-text-muted">{saveStatus}</p>}
      </aside>
    </main>
  )
}
