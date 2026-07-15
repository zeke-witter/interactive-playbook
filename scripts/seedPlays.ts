/**
 * Seed script — Phase 1. Uses the SECRET (service_role) key, which bypasses RLS,
 * to (idempotently) create the "Mousetrap" team and upsert every play from the
 * committed static catalog (`src/data/plays`) into the `play` table.
 *
 * Run: npm run seed   (=> tsx --env-file=.env.local scripts/seedPlays.ts)
 * Re-run after any local publish until Phase 3 moves authoring to the DB.
 *
 * The committed `src/data/plays/*.ts` files remain the seed source of truth.
 */
import { createClient } from '@supabase/supabase-js'
import { ALL_PLAYS } from '../src/data/plays'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !secretKey) {
  console.error(
    'Missing env. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set ' +
      '(run via `npm run seed`, which loads .env.local).',
  )
  process.exit(1)
}

const sb = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data: team, error: teamErr } = await sb
    .from('team')
    .upsert({ name: 'Mousetrap' }, { onConflict: 'name' })
    .select()
    .single()
  if (teamErr) throw teamErr

  for (const p of ALL_PLAYS) {
    const { error } = await sb.from('play').upsert(
      {
        team_id: team!.id,
        slug: p.id,
        name: p.name,
        category: p.category,
        set: p.set,
        description: p.description,
        status: 'published',
        data: p.steps,
      },
      { onConflict: 'team_id,slug' },
    )
    if (error) throw error
  }

  console.log(`seeded ${ALL_PLAYS.length} plays into team "${team!.name}" (${team!.id})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
