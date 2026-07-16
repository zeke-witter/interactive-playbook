'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveSubmission, denySubmission } from './actions'
import { CATEGORY_LABELS, SET_LABELS } from '@/lib/playLabels'
import type { PendingSubmission } from '@/lib/playsRepo'

const BTN =
  'cursor-pointer whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'

/** Captain/admin approval queue for a team: approve or deny (with an optional
 *  note) each pending play submission. */
export function PendingApprovalsPanel({ teamId, pending }: { teamId: string; pending: PendingSubmission[] }) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // The submission slug whose deny-note input is open, and its note text.
  const [denyFor, setDenyFor] = useState<string | null>(null)
  const [note, setNote] = useState('')

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  if (pending.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pending approvals</h3>
        <p className="text-sm text-text-muted">No pending submissions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pending approvals</h3>
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {pending.map((p) => {
          const denying = denyFor === p.slug
          return (
            <li key={p.slug} className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{p.name}</p>
                  <p className="text-xs text-text-muted">
                    {p.submittedBy} · {CATEGORY_LABELS[p.category]} · {SET_LABELS[p.set]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => approveSubmission(teamId, p.slug))}
                    className={BTN}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNote('')
                      setDenyFor(denying ? null : p.slug)
                    }}
                    className={BTN}
                  >
                    Deny
                  </button>
                </div>
              </div>
              {denying && (
                <div className="flex items-center gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason (optional)"
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const res = await denySubmission(teamId, p.slug, note)
                        if (!res?.error) setDenyFor(null)
                        return res
                      })
                    }
                    className={BTN}
                  >
                    Confirm deny
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
