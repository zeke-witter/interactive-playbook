'use server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase/server'

export type Role = 'player' | 'captain'
type Result = { error?: string }

/**
 * Verify the caller may manage `teamId` (global admin, or captain of that team).
 * Defense in depth — RLS also enforces this. Throws on failure.
 */
async function requireManage(teamId: string) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const [{ data: prof }, { data: mem }] = await Promise.all([
    supabase.from('profile').select('is_admin').eq('user_id', user.id).maybeSingle(),
    supabase.from('membership').select('role').eq('team_id', teamId).eq('user_id', user.id).maybeSingle(),
  ])
  const isAdmin = prof?.is_admin ?? false
  if (!isAdmin && mem?.role !== 'captain') throw new Error('You don’t manage this team.')
  return { supabase, user, isAdmin }
}

/** True if `userId` is currently the only captain of `teamId`. */
async function isLastCaptain(
  supabase: Awaited<ReturnType<typeof requireManage>>['supabase'],
  teamId: string,
  userId: string,
) {
  const { data } = await supabase.from('membership').select('user_id').eq('team_id', teamId).eq('role', 'captain')
  const ids = (data ?? []).map((c: { user_id: string }) => c.user_id)
  return ids.includes(userId) && ids.length === 1
}

async function targetIsAdmin(
  supabase: Awaited<ReturnType<typeof requireManage>>['supabase'],
  userId: string,
) {
  const { data } = await supabase.from('profile').select('is_admin').eq('user_id', userId).maybeSingle()
  return data?.is_admin ?? false
}

/** Invite by email. A DB trigger promotes it to membership now (if the person
 *  already has an account) or on their first sign-in. */
export async function inviteMember(teamId: string, emailRaw: string, role: Role): Promise<Result> {
  try {
    const { supabase, user } = await requireManage(teamId)
    const email = emailRaw.trim().toLowerCase()
    if (!email || !email.includes('@')) return { error: 'Enter a valid email.' }

    const { error } = await supabase
      .from('pending_membership')
      .insert({ team_id: teamId, email, role, invited_by: user.id })
    if (error && error.code !== '23505') throw error // 23505 = already invited
    revalidatePath('/team')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not add member.' }
  }
}

export async function setMemberRole(teamId: string, userId: string, role: Role): Promise<Result> {
  try {
    const { supabase, isAdmin } = await requireManage(teamId)
    if ((await targetIsAdmin(supabase, userId)) && !isAdmin) return { error: 'Only an admin can modify an admin.' }
    if (role === 'player' && (await isLastCaptain(supabase, teamId, userId)))
      return { error: 'Can’t demote the last captain.' }

    const { error } = await supabase.from('membership').update({ role }).eq('team_id', teamId).eq('user_id', userId)
    if (error) throw error
    revalidatePath('/team')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not update role.' }
  }
}

export async function removeMember(teamId: string, userId: string): Promise<Result> {
  try {
    const { supabase, isAdmin } = await requireManage(teamId)
    if ((await targetIsAdmin(supabase, userId)) && !isAdmin) return { error: 'Only an admin can remove an admin.' }
    if (await isLastCaptain(supabase, teamId, userId)) return { error: 'Can’t remove the last captain.' }

    const { error } = await supabase.from('membership').delete().eq('team_id', teamId).eq('user_id', userId)
    if (error) throw error
    revalidatePath('/team')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not remove member.' }
  }
}

export async function cancelInvite(pendingId: string): Promise<Result> {
  try {
    const supabase = await getServerSupabase()
    const { data: row } = await supabase.from('pending_membership').select('team_id').eq('id', pendingId).maybeSingle()
    if (!row) return {}
    await requireManage(row.team_id)
    const { error } = await supabase.from('pending_membership').delete().eq('id', pendingId)
    if (error) throw error
    revalidatePath('/team')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not cancel invite.' }
  }
}
