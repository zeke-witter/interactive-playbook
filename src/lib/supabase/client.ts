import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client (publishable/anon key, RLS-enforced). Used by
 * client components — e.g. the sign-in button. `createBrowserClient` returns a
 * singleton by default, so calling this repeatedly is cheap.
 *
 * Never use this for privileged work; all access is gated by RLS.
 */
export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
