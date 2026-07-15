'use client'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { signOut } from '@/app/auth/actions'
import type { CurrentProfile } from '@/lib/supabase/server'

/**
 * Minimal auth control for the home page. Signed out → "Sign in with Google"
 * (starts the OAuth redirect). Signed in → display name (+ an admin tag) and a
 * sign-out button. Phase 2 gates nothing else; this just proves auth works and
 * surfaces identity.
 */
export function AuthButton({ profile }: { profile: CurrentProfile | null }) {
  async function signIn() {
    const supabase = getBrowserSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (!profile) {
    return (
      <button
        onClick={signIn}
        className="rounded-md border border-accent bg-surface-raised px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface transition-colors"
      >
        Sign in with Google
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-muted">
        {profile.displayName}
        {profile.isAdmin && <span className="ml-1 text-accent">· admin</span>}
      </span>
      <form action={signOut}>
        <button type="submit" className="text-sm text-text-muted hover:text-text transition-colors">
          Sign out
        </button>
      </form>
    </div>
  )
}
