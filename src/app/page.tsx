'use client'
import Link from 'next/link'
import { ALL_PLAYS } from '@/data/plays'
import { useProgress } from '@/hooks/useProgress'

export default function HomePage() {
  const { completedCount } = useProgress()

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide mb-6">Mousetrap Plays</h1>
      <ul className="flex flex-col gap-3">
        {ALL_PLAYS.map((play) => (
          <li key={play.id}>
            <Link href={`/plays/${play.id}`} className="block rounded-xl border border-border bg-surface p-4 hover:bg-surface-raised transition-colors">
              <div className="font-display font-medium uppercase tracking-wide">{play.name}</div>
              <div className="text-sm text-accent uppercase tracking-wide">{play.category} · {play.set}</div>
              <div className="text-sm text-text-muted">{completedCount(play.id)}/7 positions learned</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
