import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPersonalPlays, getPublishedPlays } from '@/lib/playsRepo'
import { getCurrentProfile } from '@/lib/supabase/server'
import { MyPlaybookList } from './MyPlaybookList'

/** A signed-in user's personal playbook: their plays + import-from-team. */
export default async function MyPlaybookPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/')

  const [mine, teamPlays] = await Promise.all([getPersonalPlays(), getPublishedPlays()])
  const mineSlugs = new Set(mine.map((p) => p.id))
  const toItem = (p: (typeof mine)[number]) => ({ slug: p.id, name: p.name, category: p.category, set: p.set })

  return (
    <main className="min-h-full bg-bg p-6 md:p-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text">My playbook</h1>
          <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
            ← Back
          </Link>
        </header>
        <MyPlaybookList
          plays={mine.map(toItem)}
          importable={teamPlays.filter((p) => !mineSlugs.has(p.id)).map(toItem)}
        />
      </div>
    </main>
  )
}
