'use client'
import { useState } from 'react'
import { NarrativeWithTooltips } from './NarrativeWithTooltips'
import type { Position } from '@/types/play'

type NarrativePanelProps = {
  text: string | undefined
  onHighlightZone: (zone: { x: number; y: number; width: number; height: number } | null) => void
  roster: Record<Position, string>
  playId: string
  stepId: string
  position: Position
}

const CAN_EDIT_NARRATIVE = process.env.NODE_ENV === 'development'

export function NarrativePanel({ text, onHighlightZone, roster, playId, stepId, position }: NarrativePanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  function startEditing() {
    setDraft(text ?? '')
    setStatus(null)
    setIsEditing(true)
  }

  async function handleSave() {
    setStatus('Saving...')
    try {
      const res = await fetch(`/api/plays/${playId}/narrative`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, position, text: draft }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }
      setStatus('Saved — reloading...')
      window.location.reload()
    } catch {
      setStatus('Error: failed to save')
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-muted">
          Editing the raw template — position tokens like C1/H2 stay as-is here and get swapped for your team&apos;s names when viewing normally.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full px-2 py-1 rounded-md border border-border bg-bg text-text text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-3 py-1 text-sm rounded-md border border-accent bg-accent text-accent-foreground">
            Save
          </button>
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm rounded-md border border-border text-text-muted">
            Cancel
          </button>
        </div>
        {status && <p className="text-xs text-text-muted">{status}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {!text ? (
        <p className="text-lg leading-relaxed text-text-muted">
          You&apos;re off the disc for this step — hold your spacing and watch how the play develops.
        </p>
      ) : (
        <NarrativeWithTooltips text={text} onHighlightZone={onHighlightZone} roster={roster} />
      )}
      {CAN_EDIT_NARRATIVE && (
        <button onClick={startEditing} className="self-start text-xs text-text-muted hover:text-accent underline">
          Edit narrative
        </button>
      )}
    </div>
  )
}
