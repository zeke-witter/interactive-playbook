'use client'
import { useState, useTransition } from 'react'
import { createTeam } from './actions'

/** Admin-only: create a new team. The new (empty) team then appears below with
 *  its own add-by-email form. */
export function CreateTeamForm() {
  const [busy, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text">Create a team</h2>
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-text">{error}</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const value = name
          setError(null)
          startTransition(async () => {
            const res = await createTeam(value)
            if (res.error) setError(res.error)
            else setName('')
          })
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Team name"
          className="min-w-56 flex-1 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text"
        />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer whitespace-nowrap rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          Create team
        </button>
      </form>
    </section>
  )
}
