'use server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase/server'
import { buildPlay } from '@/lib/playDesignerConvert'
import { sanitizeSlug } from '@/lib/slug'
import type { Play, PlayerState } from '@/types/play'
import type { DesignerStep } from '@/types/designer'

/**
 * DB-backed authoring (replaces the retired dev-only ts-morph file routes).
 * Everything runs as the signed-in user under RLS; actions also re-check auth
 * in code. `play.data` holds the flat PlayStep[]; `draft.data` the nested tree.
 */

export type DesignerSession = {
  name: string
  category: Play['category']
  set: Play['set']
  description: string
  steps: DesignerStep[]
  /** When overwriting an existing play, its current slug; else derived from name. */
  slug?: string
}
type Result = { error?: string; slug?: string }

async function requireUser() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to save.')
  return { supabase, user }
}

function flatSteps(session: DesignerSession, slug: string) {
  const play = buildPlay({
    id: slug,
    name: session.name,
    category: session.category,
    set: session.set,
    description: session.description ?? '',
    steps: session.steps,
  })
  return play.steps
}

/** Save/publish to the caller's personal playbook (team_id null). */
export async function publishPersonalPlay(session: DesignerSession): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    if (!session.name?.trim() || !Array.isArray(session.steps) || session.steps.length === 0)
      return { error: 'Add a name and at least one step.' }
    const slug = (session.slug?.trim() || sanitizeSlug(session.name))
    const row = {
      owner_id: user.id,
      team_id: null,
      slug,
      name: session.name.trim(),
      category: session.category,
      set: session.set,
      description: session.description ?? '',
      status: 'published' as const,
      data: flatSteps(session, slug),
    }
    // Partial unique index (owner_id, slug) where team_id is null can't be an
    // upsert conflict target via supabase-js, so select-then-insert/update.
    const { data: existing } = await supabase
      .from('play')
      .select('id')
      .is('team_id', null)
      .eq('owner_id', user.id)
      .eq('slug', slug)
      .maybeSingle()

    const { error } = existing
      ? await supabase.from('play').update(row).eq('id', existing.id)
      : await supabase.from('play').insert(row)
    if (error) throw error

    revalidatePath('/my-playbook')
    return { slug }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save play.' }
  }
}

/** Publish directly to a team's playbook (captain/admin only; RLS enforces). */
export async function publishTeamPlay(teamId: string, session: DesignerSession): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    if (!session.name?.trim() || !Array.isArray(session.steps) || session.steps.length === 0)
      return { error: 'Add a name and at least one step.' }
    const slug = (session.slug?.trim() || sanitizeSlug(session.name))
    const base = {
      team_id: teamId,
      slug,
      name: session.name.trim(),
      category: session.category,
      set: session.set,
      description: session.description ?? '',
      status: 'published' as const,
      data: flatSteps(session, slug),
    }
    const { data: existing } = await supabase
      .from('play')
      .select('id')
      .eq('team_id', teamId)
      .eq('slug', slug)
      .maybeSingle()

    const { error } = existing
      ? await supabase.from('play').update(base).eq('id', existing.id)
      : await supabase.from('play').insert({ ...base, created_by: user.id })
    if (error) throw error

    revalidatePath('/')
    revalidatePath(`/plays/${slug}`)
    return { slug }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not publish to team.' }
  }
}

export async function deletePersonalPlay(slug: string): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('play')
      .delete()
      .is('team_id', null)
      .eq('owner_id', user.id)
      .eq('slug', slug)
    if (error) throw error
    revalidatePath('/my-playbook')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not delete play.' }
  }
}

/** Copy a published team play into my personal playbook (snapshot; auto-suffix slug on collision). */
export async function importTeamPlayToPersonal(teamPlaySlug: string): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    const { data: src, error: srcErr } = await supabase
      .from('play')
      .select('name,category,set,description,data')
      .not('team_id', 'is', null)
      .eq('slug', teamPlaySlug)
      .eq('status', 'published')
      .maybeSingle()
    if (srcErr) throw srcErr
    if (!src) return { error: 'Play not found.' }

    // Find a free slug within my personal playbook.
    const { data: mine } = await supabase.from('play').select('slug').is('team_id', null).eq('owner_id', user.id)
    const taken = new Set((mine ?? []).map((p: { slug: string }) => p.slug))
    let slug = teamPlaySlug
    for (let n = 2; taken.has(slug); n++) slug = `${teamPlaySlug}-${n}`

    const { error } = await supabase.from('play').insert({
      owner_id: user.id,
      team_id: null,
      slug,
      name: src.name,
      category: src.category,
      set: src.set,
      description: src.description ?? '',
      status: 'published',
      data: src.data,
    })
    if (error) throw error
    revalidatePath('/my-playbook')
    return { slug }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not import play.' }
  }
}

/**
 * Save the current layout as the default formation for a set (admin only).
 * Overrides the committed default; every future New Play / set-switch in that
 * set starts from this layout. Existing plays are unaffected.
 */
export async function saveFormation(setId: Play['set'], players: PlayerState[]): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    const { data: prof } = await supabase.from('profile').select('is_admin').eq('user_id', user.id).maybeSingle()
    if (!prof?.is_admin) return { error: 'Only an admin can edit formation templates.' }
    if (!Array.isArray(players) || players.length === 0) return { error: 'Nothing to save.' }

    const { error } = await supabase.from('formation').upsert(
      { set_id: setId, data: players, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'set_id' },
    )
    if (error) throw error
    revalidatePath('/designer')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save template.' }
  }
}

// --- Named drafts (nested Designer tree), per user; replaces the file routes. ---

export type DraftPayload = { category: Play['category']; set: Play['set']; description?: string; steps: DesignerStep[] }

export async function listDrafts(): Promise<string[]> {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('draft').select('name').eq('user_id', user.id).order('name')
  return (data ?? []).map((d: { name: string }) => d.name)
}

export async function saveDraft(name: string, payload: DraftPayload, scope: string = 'personal'): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    if (!name.trim()) return { error: 'Name the draft first.' }
    const row = {
      user_id: user.id,
      // The playbook a draft belongs to: null = personal, else the team id.
      // Lets the Designer filter drafts by the active playbook.
      team_id: scope === 'personal' ? null : scope,
      name: name.trim(),
      category: payload.category,
      set: payload.set,
      description: payload.description ?? '',
      data: payload.steps,
    }
    const { data: existing } = await supabase
      .from('draft')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .maybeSingle()
    const { error } = existing
      ? await supabase.from('draft').update(row).eq('id', existing.id)
      : await supabase.from('draft').insert(row)
    if (error) throw error
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save draft.' }
  }
}

export async function loadDraft(name: string): Promise<{ draft?: DraftPayload; error?: string }> {
  try {
    const { supabase, user } = await requireUser()
    const { data, error } = await supabase
      .from('draft')
      .select('category,set,description,data')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle()
    if (error) throw error
    if (!data) return { error: 'Draft not found.' }
    return { draft: { category: data.category, set: data.set, description: data.description, steps: data.data as DesignerStep[] } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not load draft.' }
  }
}

export async function deleteDraft(name: string): Promise<Result> {
  try {
    const { supabase, user } = await requireUser()
    const { error } = await supabase.from('draft').delete().eq('user_id', user.id).eq('name', name)
    if (error) throw error
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not delete draft.' }
  }
}
