'use client'
import { useState, useTransition } from 'react'
import type { Division } from '@/types/roster'
import type { RosterName } from '@/lib/playsRepo'
import { setTeamDivision, addRosterName, removeRosterName } from './actions'

const BTN =
  'cursor-pointer whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'
const ADD_BTN =
  'cursor-pointer whitespace-nowrap rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'
const FIELD = 'rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text'

/** Gender to store for a name given the team's division. Mixed lets the manager
 *  choose; open/women imply a single gender (only the count matters there). */
function impliedGender(division: Division, chosen: 'mmp' | 'fmp'): 'mmp' | 'fmp' {
  if (division === 'open') return 'mmp'
  if (division === 'women') return 'fmp'
  return chosen
}

function RoleColumn({
  teamId,
  division,
  role,
  names,
  busy,
  run,
}: {
  teamId: string
  division: Division
  role: 'cutter' | 'handler'
  names: RosterName[]
  busy: boolean
  run: (fn: () => Promise<{ error?: string }>) => void
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'mmp' | 'fmp'>('mmp')
  const title = role === 'cutter' ? 'Cutters' : 'Handlers'

  return (
    <div className="flex flex-1 flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const value = name
          run(async () => {
            const res = await addRosterName(teamId, role, impliedGender(division, gender), value)
            if (!res.error) setName('')
            return res
          })
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className={`${FIELD} min-w-32 flex-1`}
        />
        {division === 'mixed' && (
          <select value={gender} onChange={(e) => setGender(e.target.value as 'mmp' | 'fmp')} className={FIELD}>
            <option value="mmp">MMP</option>
            <option value="fmp">FMP</option>
          </select>
        )}
        <button type="submit" disabled={busy} className={ADD_BTN}>
          Add
        </button>
      </form>

      <div className="flex flex-col gap-1">
        {names.length === 0 && <p className="px-1 text-xs text-text-muted">No {title.toLowerCase()} yet.</p>}
        {names.map((n) => (
          <div key={n.id} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5">
            <span className="text-sm text-text">
              {n.name}
              {division === 'mixed' && (
                <span className="ml-1 text-xs uppercase text-text-muted">· {n.gender}</span>
              )}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm(`Remove ${n.name}?`)) run(() => removeRosterName(teamId, n.id))
              }}
              className={BTN}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RosterPanel({
  teamId,
  division,
  names,
}: {
  teamId: string
  division: Division
  names: RosterName[]
}) {
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
    })
  }

  const cutters = names.filter((n) => n.role === 'cutter')
  const handlers = names.filter((n) => n.role === 'handler')

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text">Roster names</h2>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Division
          <select
            value={division}
            disabled={busy}
            onChange={(e) => run(() => setTeamDivision(teamId, e.target.value as Division))}
            className={FIELD}
          >
            <option value="open">Open</option>
            <option value="women">Women</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>

      <p className="-mt-3 text-xs text-text-muted">
        Names fill the player tokens in this team&rsquo;s plays, drawn at random on each view.
        {division === 'mixed'
          ? ' Mixed teams tag each name MMP/FMP to build a gender-balanced line.'
          : ' Add at least 4 cutters and 3 handlers to fill every position.'}
      </p>

      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <RoleColumn teamId={teamId} division={division} role="cutter" names={cutters} busy={busy} run={run} />
        <RoleColumn teamId={teamId} division={division} role="handler" names={handlers} busy={busy} run={run} />
      </div>
    </section>
  )
}
