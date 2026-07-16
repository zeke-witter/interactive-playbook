import { notFound, redirect } from 'next/navigation'
import { getPersonalPlayBySlug, getPersonalPlays } from '@/lib/playsRepo'
import { getCurrentProfile } from '@/lib/supabase/server'
import { PlayViewer } from '@/app/plays/[playId]/PlayViewer'

/**
 * Owner-only viewer for a personal play. Separate route from /plays/[slug]
 * (the public team viewer) because personal and team slugs can collide. RLS
 * guarantees getPersonalPlayBySlug only returns the caller's own play.
 */
export default async function PersonalPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/')

  const [play, plays] = await Promise.all([getPersonalPlayBySlug(slug), getPersonalPlays()])
  if (!play) notFound()

  return <PlayViewer play={play} plays={plays} basePath="/my-playbook" />
}
