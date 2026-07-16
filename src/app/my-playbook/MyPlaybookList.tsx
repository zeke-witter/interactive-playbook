'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deletePersonalPlay, importTeamPlayToPersonal } from '@/app/designer/actions'
import { CATEGORY_LABELS, SET_LABELS } from '@/lib/playLabels'
import type { Play } from '@/types/play'

type Item = { slug: string; name: string; category: Play['category']; set: Play['set'] }

const BTN =
  'cursor-pointer whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'

export function MyPlaybookList({ plays, importable }: { plays: Item[]; importable: Item[] }) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text">My plays</h2>
          <Link href="/designer" className={BTN}>
            + New play
          </Link>
        </div>
        {plays.length === 0 ? (
          <p className="text-sm text-text-muted">
            No personal plays yet. Build one in the <Link href="/designer" className="text-accent underline">Designer</Link> and save it here, or import a team play below.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {plays.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{p.name}</p>
                  <p className="text-xs text-text-muted">
                    {CATEGORY_LABELS[p.category]} · {SET_LABELS[p.set]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/my-playbook/${p.slug}`} className={BTN}>
                    View
                  </Link>
                  <Link href={`/designer?play=${encodeURIComponent(p.slug)}&scope=personal`} className={BTN}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete "${p.name}" from your playbook? This can't be undone.`))
                        run(() => deletePersonalPlay(p.slug))
                    }}
                    className={BTN}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {importable.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text">Import from a team</h2>
          <p className="text-xs text-text-muted">Copies a published team play into your playbook so you can edit your own version.</p>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {importable.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{p.name}</p>
                  <p className="text-xs text-text-muted">
                    {CATEGORY_LABELS[p.category]} · {SET_LABELS[p.set]}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => run(() => importTeamPlayToPersonal(p.slug))} className={BTN}>
                  Import
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
