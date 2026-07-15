import { AmbientField } from '@/components/field/AmbientField'
import { PlayPicker } from '@/components/sidebar/PlayPicker'
import { getPublishedPlays } from '@/lib/playsRepo'

export default async function HomePage() {
  const plays = await getPublishedPlays()

  return (
    <main className="flex flex-col md:flex-row h-screen overflow-hidden bg-bg">
      <div className="w-full md:w-[65%] aspect-[5/6] md:aspect-auto shrink-0 md:h-full p-4">
        <div className="relative w-full h-full rounded-xl border border-border bg-surface overflow-hidden">
          <AmbientField />
        </div>
      </div>
      <aside className="w-full md:w-[35%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col overflow-y-auto border-t md:border-t-0 md:border-l border-border p-4 gap-4">
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text">Mousetrap Plays</h1>
          <p className="mt-1 text-sm text-text-muted">Pick a play below to get started.</p>
        </div>
        <div className="rounded-xl border-2 border-accent bg-surface-raised p-4 shadow-[0_0_28px_rgba(163,230,53,0.28)]">
          <PlayPicker plays={plays} />
        </div>
      </aside>
    </main>
  )
}
