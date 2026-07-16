import { AmbientField } from '@/components/field/AmbientField'
import { PlaybookBrowser, type Playbook } from '@/components/viewer/PlaybookBrowser'
import { getPublishedPlays, getPersonalPlays, getMemberTeams, getTeamPlays } from '@/lib/playsRepo'
import { getCurrentProfile } from '@/lib/supabase/server'

export default async function HomePage() {
  const profile = await getCurrentProfile()

  let books: Playbook[]
  if (profile) {
    const [personal, teams] = await Promise.all([getPersonalPlays(), getMemberTeams()])
    const teamBooks: Playbook[] = await Promise.all(
      teams.map(async (t) => ({ id: t.id, name: t.name, plays: await getTeamPlays(t.id), basePath: '/plays' })),
    )
    // Teams first (the shared content), then the user's personal playbook.
    books = [...teamBooks, { id: 'personal', name: 'My Playbook', plays: personal, basePath: '/my-playbook' }]
    if (books.every((b) => b.plays.length === 0)) {
      books = [{ id: 'public', name: 'Plays', plays: await getPublishedPlays(), basePath: '/plays' }]
    }
  } else {
    books = [{ id: 'public', name: 'Plays', plays: await getPublishedPlays(), basePath: '/plays' }]
  }

  return (
    <main className="flex flex-col md:flex-row h-full overflow-hidden bg-bg">
      <div className="w-full md:w-[65%] aspect-[5/6] md:aspect-auto shrink-0 md:h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <AmbientField />
        </div>
      </div>
      <aside className="w-full md:w-[35%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col overflow-y-auto border-t md:border-t-0 md:border-l border-border p-4 gap-4">
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Plays</h1>
          <p className="mt-1 text-sm text-text-muted">Pick a playbook and a play to get started.</p>
        </div>
        <div className="rounded-xl border-2 border-accent bg-surface-raised p-4 shadow-[0_0_28px_rgba(163,230,53,0.28)]">
          <PlaybookBrowser books={books} />
        </div>
      </aside>
    </main>
  )
}
