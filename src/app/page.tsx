import Link from 'next/link'
import { flood } from '@/data/plays/flood'
import type { Play } from '@/types/play'

const PLAYS: Play[] = [flood]

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mousetrap Plays</h1>
      <ul className="flex flex-col gap-3">
        {PLAYS.map((play) => (
          <li key={play.id}>
            <Link href={`/plays/${play.id}`} className="block rounded border border-gray-200 p-4 hover:bg-gray-50">
              <div className="font-semibold">{play.name}</div>
              <div className="text-sm text-gray-500">{play.category} · {play.set}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
