import { notFound } from 'next/navigation'
import { getPlayBySlug, getPublishedPlays } from '@/lib/playsRepo'
import { PlayViewer } from './PlayViewer'

export default async function PlayPage({ params }: { params: Promise<{ playId: string }> }) {
  const { playId } = await params
  const [play, plays] = await Promise.all([getPlayBySlug(playId), getPublishedPlays()])
  if (!play) notFound()

  return <PlayViewer play={play} plays={plays} />
}
