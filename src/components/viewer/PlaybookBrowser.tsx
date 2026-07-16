'use client'
import { useState } from 'react'
import { PlayPicker } from '@/components/sidebar/PlayPicker'
import type { Play } from '@/types/play'

export type Playbook = { id: string; name: string; plays: Play[]; basePath: string }

/**
 * Root-viewer playbook chooser. When the caller belongs to more than one
 * playbook (their teams + personal), shows a selector; picking one feeds its
 * plays + route base into the PlayPicker. The PlayPicker is keyed by playbook
 * so its breadcrumb resets when you switch.
 */
export function PlaybookBrowser({ books }: { books: Playbook[] }) {
  const [selected, setSelected] = useState(0)
  const book = books[selected] ?? books[0]

  return (
    <div className="flex flex-col gap-3">
      {books.length > 1 && (
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
          Viewing
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text"
          >
            {books.map((b, i) => (
              <option key={b.id} value={i}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {book.plays.length === 0 ? (
        <p className="text-sm text-text-muted">No plays in this playbook yet.</p>
      ) : (
        <PlayPicker key={book.id} plays={book.plays} basePath={book.basePath} />
      )}
    </div>
  )
}
