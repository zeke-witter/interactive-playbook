import { getCurrentProfile } from '@/lib/supabase/server'
import {
  getMemberTeams,
  getPersonalPlays,
  getTeamPlays,
  getDrafts,
  getPersonalPlayBySlug,
  getPlayBySlug,
} from '@/lib/playsRepo'
import { ALL_PLAYS } from '@/data/plays'
import { DesignerApp } from './DesignerApp'
import type { Play } from '@/types/play'

/**
 * Server shell for the Play Designer. Fetches everything the "active playbook"
 * model needs — the signed-in profile, the teams the caller belongs to, and the
 * plays + drafts for each playbook (personal + per team) — then hands it all to
 * the `'use client'` `DesignerApp`. `?play`/`?scope` open an existing play into
 * the editor (scope 'personal' → the caller's play, else a published team play).
 * `router.refresh()` from the client re-runs this loader after save/publish/delete.
 */
export default async function DesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ play?: string; scope?: string }>
}) {
  const { play, scope } = await searchParams

  const [profile, memberTeams, personalPlays, draftList] = await Promise.all([
    getCurrentProfile(),
    getMemberTeams(),
    getPersonalPlays(),
    getDrafts(),
  ])

  // One published-play list per member team, keyed by team id.
  const teamPlaysEntries = await Promise.all(
    memberTeams.map(async (team) => [team.id, await getTeamPlays(team.id)] as const),
  )
  const teamPlays: Record<string, Play[]> = Object.fromEntries(teamPlaysEntries)

  const initialScope = scope ?? 'personal'
  let initialPlay: Play | null = null
  if (play) {
    initialPlay =
      initialScope === 'personal' ? await getPersonalPlayBySlug(play) : await getPlayBySlug(play)
  }

  return (
    <DesignerApp
      profile={profile}
      memberTeams={memberTeams}
      personalPlays={personalPlays}
      teamPlays={teamPlays}
      starterPlays={ALL_PLAYS}
      draftList={draftList}
      initialPlay={initialPlay}
      initialScope={initialScope}
    />
  )
}
