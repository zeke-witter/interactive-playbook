import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSupabase, getCurrentProfile } from '@/lib/supabase/server'
import { TeamPanel, type TeamData } from './TeamPanel'
import { TeamPlaysPanel } from './TeamPlaysPanel'
import { CreateTeamForm } from './CreateTeamForm'
import { getManagedTeamPlays, type ManagedTeamPlay } from '@/lib/playsRepo'
import type { Role } from './actions'

/**
 * Team management — gated to the global admin and team captains (URL-only, like
 * /designer). Single team (Mousetrap) for now; renders one panel per team the
 * caller may manage. All queries are RLS-enforced; the actions re-check role.
 */
export default async function TeamPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.canManage) notFound()

  const supabase = await getServerSupabase()
  const [{ data: teams }, { data: myMems }] = await Promise.all([
    supabase.from('team').select('id,name').order('name'),
    supabase.from('membership').select('team_id,role').eq('user_id', profile.userId),
  ])
  const captainTeams = new Set(
    (myMems ?? []).filter((m: { role: Role }) => m.role === 'captain').map((m: { team_id: string }) => m.team_id),
  )
  const manageable = (teams ?? []).filter(
    (t: { id: string }) => profile.isAdmin || captainTeams.has(t.id),
  )
  if (manageable.length === 0 && !profile.isAdmin) notFound()

  const panels: { team: TeamData; plays: ManagedTeamPlay[] }[] = await Promise.all(
    manageable.map(async (t: { id: string; name: string }) => {
      const [{ data: mems }, { data: pending }, plays] = await Promise.all([
        supabase.from('membership').select('user_id,role').eq('team_id', t.id),
        supabase.from('pending_membership').select('id,email,role').eq('team_id', t.id).order('created_at'),
        getManagedTeamPlays(t.id),
      ])
      const userIds = (mems ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profs } = userIds.length
        ? await supabase.from('profile').select('user_id,display_name,is_admin').in('user_id', userIds)
        : { data: [] as { user_id: string; display_name: string; is_admin: boolean }[] }
      const byId = new Map((profs ?? []).map((p) => [p.user_id, p]))

      const members = (mems ?? [])
        .map((m: { user_id: string; role: Role }) => ({
          userId: m.user_id,
          displayName: byId.get(m.user_id)?.display_name ?? 'Unknown',
          role: m.role,
          isAdmin: byId.get(m.user_id)?.is_admin ?? false,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))

      return {
        team: { id: t.id, name: t.name, members, pending: (pending ?? []) as TeamData['pending'] },
        plays,
      }
    }),
  )

  return (
    <main className="min-h-full bg-bg p-6 md:p-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text">Team management</h1>
          <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
            ← Back
          </Link>
        </header>
        {profile.isAdmin && <CreateTeamForm />}
        {panels.map(({ team, plays }) => (
          <div key={team.id} className="flex flex-col gap-4">
            <TeamPanel team={team} currentUserId={profile.userId} isAdmin={profile.isAdmin} />
            <div className="rounded-xl border border-border bg-surface p-5">
              <TeamPlaysPanel teamId={team.id} plays={plays} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
