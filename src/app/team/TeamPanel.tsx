'use client'
import { useState, useTransition } from 'react'
import { inviteMember, setMemberRole, removeMember, cancelInvite, type Role } from './actions'

type Member = { userId: string; displayName: string; role: Role; isAdmin: boolean }
type Pending = { id: string; email: string; role: Role }
export type TeamData = { id: string; name: string; members: Member[]; pending: Pending[] }

const BTN =
  'cursor-pointer whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'
const ADD_BTN =
  'cursor-pointer whitespace-nowrap rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60'
const FIELD = 'rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text'

export function TeamPanel({
  team,
  currentUserId,
  isAdmin,
}: {
  team: TeamData
  currentUserId: string
  isAdmin: boolean
}) {
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('player')

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
    })
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text">{team.name}</h2>

      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}

      {/* Add member */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const value = email
          run(async () => {
            const res = await inviteMember(team.id, value, inviteRole)
            if (!res.error) setEmail('')
            return res
          })
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@gmail.com"
          className={`${FIELD} min-w-56 flex-1`}
        />
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className={FIELD}>
          <option value="player">Player</option>
          <option value="captain">Captain</option>
        </select>
        <button type="submit" disabled={busy} className={ADD_BTN}>
          Add member
        </button>
      </form>
      <p className="-mt-3 text-xs text-text-muted">
        They join on their next Google sign-in (or immediately if they already have an account). No email is sent — let
        them know to sign in.
      </p>

      {/* Members */}
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Members</h3>
        {team.members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5">
            <span className="text-sm text-text">
              {m.displayName}
              {m.userId === currentUserId && <span className="ml-1 text-text-muted">(you)</span>}
              {m.isAdmin && <span className="ml-1 text-accent">· admin</span>}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                disabled={busy || (m.isAdmin && !isAdmin)}
                onChange={(e) => run(() => setMemberRole(team.id, m.userId, e.target.value as Role))}
                className={`${FIELD} py-1 text-xs`}
              >
                <option value="player">Player</option>
                <option value="captain">Captain</option>
              </select>
              <button
                type="button"
                disabled={busy || (m.isAdmin && !isAdmin)}
                onClick={() => {
                  if (confirm(`Remove ${m.displayName} from ${team.name}?`)) run(() => removeMember(team.id, m.userId))
                }}
                className={BTN}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {team.pending.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pending invites</h3>
          {team.pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5">
              <span className="text-sm text-text-muted">
                {p.email} <span className="text-text">· {p.role}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Cancel the invite for ${p.email}?`)) run(() => cancelInvite(p.id))
                }}
                className={BTN}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
