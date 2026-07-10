'use client'
import { useState } from 'react'
import { PlayPicker } from './PlayPicker'
import type { Play } from '@/types/play'

export function PickerDrawer({ currentPlay }: { currentPlay: Play }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open play picker"
        className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg"
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
            <PlayPicker currentPlay={currentPlay} />
          </div>
        </div>
      )}
    </div>
  )
}
