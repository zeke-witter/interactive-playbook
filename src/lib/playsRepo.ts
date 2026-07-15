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
