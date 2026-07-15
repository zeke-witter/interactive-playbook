import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client, built with the publishable (anon) key so all
 * reads are enforced by Row-Level Security. Create a NEW client per request —
 * never share one across requests — and never import this into a `'use client'`
 * module (it reads request cookies via `next/headers`).
 *
 * Phase 1 has no auth, so no session cookies are written; `getAll`/`setAll` are
 * wired per the `@supabase/ssr` App Router guide so Phase 2 (Google OAuth) can
 * drop in without changing this file. `cookies()` is async in Next 16.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components, cookies cannot be written during render.
          // Swallow the error; token refreshes are handled by middleware once
          // auth lands (Phase 2). See @supabase/ssr createServerClient docs.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // ignore — called from a context that can't set cookies
          }
        },
      },
    },
  )
}
