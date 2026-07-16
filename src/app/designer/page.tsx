import { getCurrentProfile } from '@/lib/supabase/server'
import { getManageableTeams, getPersonalPlayBySlug, getPlayBySlug } from '@/lib/playsRepo'
import { DesignerApp } from './DesignerApp'
import type { Play } from '@/types/play'

/**
 * Server shell for the Play Designer. Reads the optional `play`/`scope` search
 * params to open an existing play into the editor, and fetches the signed-in
 * profile + the teams the caller may publish to. All interactive state lives in
 * the `'use client'` `DesignerApp` body (mirrors how the Viewer renders `PlayViewer`).
 */
export default async function DesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ play?: string; scope?: string }>
}) {
  const { play, scope } = await searchParams
  const [profile, manageableTeams] = await Promise.all([getCurrentProfile(), getManageableTeams()])

  let initialPlay: Play | null = null
  if (play) {
    initialPlay = scope === 'personal' ? await getPersonalPlayBySlug(play) : await getPlayBySlug(play)
  }

  return <DesignerApp profile={profile} manageableTeams={manageableTeams} initialPlay={initialPlay} />
}
