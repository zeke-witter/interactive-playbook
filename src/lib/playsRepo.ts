import type { Play, PlayStep, PlayerState } from '@/types/play'
import type { Division, RosterPool } from '@/types/roster'
import { getServerSupabase } from './supabase/server'
import { defaultFormationFor } from './defaultFormations'
import { ALL_SETS } from './playLabels'

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

// These represent the public TEAM catalog. Filter team_id explicitly: RLS lets
// an admin read everyone's plays (incl. others' personal plays), so without the
// `team_id not null` guard a personal play would leak into the public catalog /
// Import list for admins.
export async function getPublishedPlays(): Promise<Play[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .eq('status', 'published')
    .not('team_id', 'is', null)
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
    .not('team_id', 'is', null)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? rowToPlay(data as PlayRow) : null
}

type RosterNameRow = { role: string; gender: string; name: string }

function emptyGenderedPool() {
  return { mmp: [] as string[], fmp: [] as string[] }
}

/**
 * The roster pool the Viewer should use for a published play: that play's team's
 * names, grouped by role and gender, plus the team's division. Returns `null`
 * for personal plays (no team) or a team with no names — the Viewer then falls
 * back to the raw position tokens (C1…H3). Public read (works for anon): both
 * `team.division` and `roster_name` are exposed for teams with published plays.
 */
export async function getRosterPoolForPlay(slug: string): Promise<RosterPool | null> {
  const sb = await getServerSupabase()
  const { data: play } = await sb
    .from('play')
    .select('team_id, team:team_id(division)')
    .eq('status', 'published')
    .not('team_id', 'is', null)
    .eq('slug', slug)
    .maybeSingle()
  if (!play?.team_id) return null

  const teamRel = play.team as { division: Division } | { division: Division }[] | null
  const division = (Array.isArray(teamRel) ? teamRel[0]?.division : teamRel?.division) ?? 'mixed'

  const { data: names } = await sb
    .from('roster_name')
    .select('role, gender, name')
    .eq('team_id', play.team_id)
  if (!names || names.length === 0) return null

  const pool: RosterPool = { division, cutters: emptyGenderedPool(), handlers: emptyGenderedPool() }
  for (const r of names as RosterNameRow[]) {
    const bucket = r.role === 'handler' ? pool.handlers : pool.cutters
    if (r.gender === 'fmp') bucket.fmp.push(r.name)
    else bucket.mmp.push(r.name)
  }
  return pool
}

// --- Personal playbooks + team management (RLS-enforced; server components) ---

/**
 * The current user's OWN personal plays. Must filter by owner_id explicitly:
 * RLS lets an admin read *everyone's* personal plays, so relying on RLS alone
 * would surface other users' plays under "My plays" (and they couldn't be
 * deleted, since delete is owner-scoped).
 */
export async function getPersonalPlays(): Promise<Play[]> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .is('team_id', null)
    .eq('owner_id', user.id)
    .order('name')
  if (error) throw error
  return (data ?? []).map((r) => rowToPlay(r as PlayRow))
}

/** A single personal play by slug, restricted to the current user's own. */
export async function getPersonalPlayBySlug(slug: string): Promise<Play | null> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null
  const { data, error } = await sb
    .from('play')
    .select(PLAY_COLUMNS)
    .is('team_id', null)
    .eq('owner_id', user.id)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? rowToPlay(data as PlayRow) : null
}

/**
 * The per-set starting formations, with any admin overrides from the DB applied
 * over the committed defaults. Always returns a complete map (falls back to
 * `defaultFormationFor` for sets with no override row).
 */
export async function getFormations(): Promise<Record<Play['set'], PlayerState[]>> {
  const sb = await getServerSupabase()
  const { data } = await sb.from('formation').select('set_id, data')
  const overrides = new Map((data ?? []).map((r: { set_id: string; data: unknown }) => [r.set_id, r.data as PlayerState[]]))
  const out = {} as Record<Play['set'], PlayerState[]>
  for (const s of ALL_SETS) out[s] = overrides.get(s) ?? defaultFormationFor(s)
  return out
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

export type Submission = {
  slug: string
  name: string
  teamId: string
  teamName: string
  status: string
  reviewNote: string | null
}

/** The caller's outstanding submissions (pending or denied team plays they authored). */
export async function getMySubmissions(): Promise<Submission[]> {
  const sb = await getServerSupabase()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb
    .from('play')
    .select('slug,name,team_id,status,review_note, team:team_id(name)')
    .eq('created_by', user.id)
    .not('team_id', 'is', null)
    .in('status', ['pending', 'denied'])
    .order('name')
  return (data ?? []).map(
    (r: {
      slug: string
      name: string
      team_id: string
      status: string
      review_note: string | null
      team: { name: string } | { name: string }[] | null
    }) => ({
      slug: r.slug,
      name: r.name,
      teamId: r.team_id,
      teamName: (Array.isArray(r.team) ? r.team[0]?.name : r.team?.name) ?? 'Team',
      status: r.status,
      reviewNote: r.review_note,
    }),
  )
}

export type PendingSubmission = {
  slug: string
  name: string
  category: Play['category']
  set: Play['set']
  submittedBy: string
}

/** Pending submissions for a team's approval queue (captain/admin view). */
export async function getPendingSubmissions(teamId: string): Promise<PendingSubmission[]> {
  const sb = await getServerSupabase()
  const { data } = await sb
    .from('play')
    .select('slug,name,category,set,created_by')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('name')
  const rows = data ?? []
  const ids = Array.from(new Set(rows.map((r: { created_by: string | null }) => r.created_by).filter(Boolean)))
  const { data: profs } = ids.length
    ? await sb.from('profile').select('user_id,display_name').in('user_id', ids)
    : { data: [] as { user_id: string; display_name: string }[] }
  const byId = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]))
  return rows.map(
    (r: { slug: string; name: string; category: Play['category']; set: Play['set']; created_by: string | null }) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      set: r.set,
      submittedBy: (r.created_by && byId.get(r.created_by)) || 'Unknown',
    }),
  )
}

export type ManagedTeamPlay = {
  slug: string
  name: string
  category: Play['category']
  set: Play['set']
  status: string
}

/** All of a team's plays (any status) for captain management. RLS lets captains
 *  read every play in their team; a non-captain would only see published ones. */
export async function getManagedTeamPlays(teamId: string): Promise<ManagedTeamPlay[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('play')
    .select('slug,name,category,set,status')
    .eq('team_id', teamId)
    .order('name')
  if (error) throw error
  return (data ?? []) as ManagedTeamPlay[]
}

export type RosterName = { id: string; role: 'cutter' | 'handler'; gender: 'mmp' | 'fmp'; name: string }

/** A team's roster names for the management UI (captain/admin; public read RLS). */
export async function getTeamRosterNames(teamId: string): Promise<RosterName[]> {
  const sb = await getServerSupabase()
  const { data, error } = await sb
    .from('roster_name')
    .select('id, role, gender, name')
    .eq('team_id', teamId)
    .order('name')
  if (error) throw error
  return (data ?? []) as RosterName[]
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
