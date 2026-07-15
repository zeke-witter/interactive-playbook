'use client'
import { useState } from 'react'
import { PlayPicker } from './PlayPicker'
import type { Play } from '@/types/play'

export function PickerDrawer({ plays, currentPlay }: { plays: Play[]; currentPlay: Play }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open play picker"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-bg border-l border-border p-4 overflow-y-auto">
            <button onClick={() => setOpen(false)} className="mb-4 text-text-muted hover:text-text">
              ✕ Close
            </button>
            <PlayPicker plays={plays} currentPlay={currentPlay} />
          </div>
        </div>
      )}
    </div>
  )
}
