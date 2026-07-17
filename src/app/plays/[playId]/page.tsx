import { notFound } from 'next/navigation'
import { getPlayBySlug, getPublishedPlays, getRosterPoolForPlay } from '@/lib/playsRepo'
import { PlayViewer } from './PlayViewer'

export default async function PlayPage({ params }: { params: Promise<{ playId: string }> }) {
  const { playId } = await params
  const [play, plays, rosterPool] = await Promise.all([
    getPlayBySlug(playId),
    getPublishedPlays(),
    getRosterPoolForPlay(playId),
  ])
  if (!play) notFound()

  return <PlayViewer play={play} plays={plays} rosterPool={rosterPool} />
}
