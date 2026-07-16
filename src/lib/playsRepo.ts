import type { Play, PlayStep } from '@/types/play'
import { getServerSupabase } from './supabase/server'

/**
 * Data-access layer for published plays. Maps `play` rows back to the existing
 * `Play` shape so the Viewer's rendering and types are unchanged: the DB `slug`
 * becomes `Play.id`, and the `jsonb` `data` column is the flat `PlayStep[]`.
 *
 * Server-only (reads through the RLS-enforced anon client). The grouping helpers
 * are pure and operate on a passed-in `Play[]`, mirroring `data/plays/index.ts`
 * so the picker can be fed server-fetched data.
 */

const PLAY_COLUMNS = 'slug,name,category,set,description,data'

type PlayRow = {
  slug: string
  name: string
  category: string
  set: string
  description: string
  data: unknown
}

function rowToPlay(row: PlayRow): Play {
  return {
    id: row.slug,
    name: row.name,
    category: row.category as Play['category'],
    set: row.set as Play['set'],
    description: row.description,
    steps: row.data as PlayStep[],
  }
}

export async function getPublishedPlays(): Promise<Play[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .eq('status', 'published')
    .order('name')
  if (error) throw error
  return (data ?? []).map(rowToPlay)
}

export async function getPlayBySlug(slug: string): Promise<Play | null> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? rowToPlay(data as PlayRow) : null
}

// --- Personal playbooks + team management (RLS-enforced; server components) ---

/** The signed-in user's personal plays (team_id null). RLS returns only theirs. */
export async function getPersonalPlays(): Promise<Play[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .is('team_id', null)
    .order('name')
  if (error) throw error
  return (data ?? []).map((r) => rowToPlay(r as PlayRow))
}

/** A single personal play by slug, owner-only (RLS). Null if not found/allowed. */
export async function getPersonalPlayBySlug(slug: string): Promise<Play | null> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .is('team_id', null)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? rowToPlay(data as PlayRow) : null
}

export type MemberTeam = { id: string; name: string; canPublish: boolean }

/** Every team the caller belongs to (admin sees all), with whether they may
 *  publish to it (captain/admin). Drives the Designer's playbook selector. */
export async function getMemberTeams(): Promise<MemberTeam[]> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []

  const { data: prof } = await sb.from('profile').select('is_admin').eq('user_id', user.id).maybeSingle()
  if (prof?.is_admin) {
    const { data } = await sb.from('team').select('id,name').order('name')
    return (data ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name, canPublish: true }))
  }
  const { data } = await sb.from('membership').select('role, team:team_id(id,name)').eq('user_id', user.id)
  return (data ?? [])
    .map((m: { role: string; team: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const t = Array.isArray(m.team) ? m.team[0] : m.team
      return t ? { id: t.id, name: t.name, canPublish: m.role === 'captain' } : null
    })
    .filter((t): t is MemberTeam => !!t)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** A team's published plays (any member may read these; RLS enforces). */
export async function getTeamPlays(teamId: string): Promise<Play[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .eq('team_id', teamId)
    .eq('status', 'published')
    .order('name')
  if (error) throw error
  return (data ?? []).map((r) => rowToPlay(r as PlayRow))
}

/** The caller's draft names tagged with their playbook scope ('personal' or a team id). */
export async function getDrafts(): Promise<{ name: string; scope: string }[]> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb.from('draft').select('name, team_id').eq('user_id', user.id).order('name')
  return (data ?? []).map((d: { name: string; team_id: string | null }) => ({
    name: d.name,
    scope: d.team_id ?? 'personal',
  }))
}

export type ManageableTeam = { id: string; name: string }

/** Teams the caller may publish to directly: captain memberships, or all teams if admin. */
export async function getManageableTeams(): Promise<ManageableTeam[]> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []

  const { data: prof } = await sb.from('profile').select('is_admin').eq('user_id', user.id).maybeSingle()
  if (prof?.is_admin) {
    const { data } = await sb.from('team').select('id,name').order('name')
    return (data ?? []) as ManageableTeam[]
  }
  const { data } = await sb
    .from('membership')
    .select('role, team:team_id(id,name)')
    .eq('user_id', user.id)
    .eq('role', 'captain')
  return (data ?? [])
    .map((m: { team: { id: string; name: string } | { id: string; name: string }[] | null }) =>
      Array.isArray(m.team) ? m.team[0] : m.team,
    )
    .filter((t): t is ManageableTeam => !!t)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// --- Pure grouping helpers (mirror data/plays/index.ts; operate on fetched data) ---

export function categoriesWithPlays(plays: Play[]): Play['category'][] {
  return Array.from(new Set(plays.map((p) => p.category)))
}

export function setsInCategory(plays: Play[], category: Play['category']): Play['set'][] {
  return Array.from(new Set(plays.filter((p) => p.category === category).map((p) => p.set)))
}

export function playsInSet(plays: Play[], category: Play['category'], set: Play['set']): Play[] {
  return plays.filter((p) => p.category === category && p.set === set)
}
