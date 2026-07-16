'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { setTeamPlayHidden, deleteTeamPlay } from './actions'
import { CATEGORY_LABELS, SET_LABELS } from '@/lib/playLabels'
import type { ManagedTeamPlay } from '@/lib/playsRepo'

const BTN =
  'cursor-pointer whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'

/** Captain/admin management of a team's plays: edit (open in Designer), hide /
 *  unhide (toggle visibility in the public viewer), and delete. */
export function TeamPlaysPanel({ teamId, plays }: { teamId: string; plays: ManagedTeamPlay[] }) {
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
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Plays</h3>
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}
      {plays.length === 0 ? (
        <p className="text-sm text-text-muted">No plays in this playbook yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {plays.map((p) => {
            const hidden = p.status === 'hidden'
            return (
              <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {p.name}
                    {hidden && <span className="ml-2 text-xs text-text-muted">(hidden)</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {CATEGORY_LABELS[p.category]} · {SET_LABELS[p.set]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/designer?play=${encodeURIComponent(p.slug)}&scope=${teamId}`} className={BTN}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => setTeamPlayHidden(teamId, p.slug, !hidden))}
                    className={BTN}
                  >
                    {hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete "${p.name}" from this team's playbook? This can't be undone.`))
                        run(() => deleteTeamPlay(teamId, p.slug))
                    }}
                    className={BTN}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
