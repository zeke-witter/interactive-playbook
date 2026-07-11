import { redirect } from 'next/navigation'
import { DEFAULT_PLAY_ID } from '@/data/plays'

export default function HomePage() {
  if (DEFAULT_PLAY_ID) redirect(`/plays/${DEFAULT_PLAY_ID}`)

  return (
    <main className="flex h-screen items-center justify-center bg-bg text-text">
      <p className="text-text-muted">
        No plays yet — build one at <code className="text-accent">/designer</code>.
      </p>
    </main>
  )
}
