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
          // Swallow the error; token refreshes are handled by the proxy
          // (src/proxy.ts). See @supabase/ssr createServerClient docs.
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

export type CurrentProfile = {
  userId: string
  displayName: string
  isAdmin: boolean
}

/**
 * The signed-in user's profile (or null if signed out), for server components.
 * Uses `getUser()` (validates the JWT) — not `getSession()`. The `profile` row
 * is created by the sign-in trigger, so it exists for any authenticated user.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profile')
    .select('display_name,is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    userId: user.id,
    displayName: data?.display_name ?? user.email ?? 'Player',
    isAdmin: data?.is_admin ?? false,
  }
}
