'use client'
import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { signOut } from '@/app/auth/actions'
import type { CurrentProfile } from '@/lib/supabase/server'

/** Google "G" mark, rendered in a white chip so the colors read on any button. */
function GoogleG() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white">
      <svg viewBox="0 0 48 48" className="h-3.5 w-3.5" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  )
}

/**
 * Auth control (lives in SiteNav). Signed out → "Sign in with Google" (starts
 * the OAuth redirect). Signed in → display name (+ admin tag) and sign out.
 * The Designer/My-Playbook/Manage-team links are owned by SiteNav.
 */
export function AuthButton({ profile }: { profile: CurrentProfile | null }) {
  const [pending, setPending] = useState(false)

  async function signIn() {
    setPending(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setPending(false) // otherwise the browser navigates away
  }

  if (!profile) {
    return (
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-all duration-150 hover:bg-accent-hover hover:shadow-md active:scale-[0.98] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleG />
        {pending ? 'Signing in…' : 'Sign in with Google'}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {profile.isAdmin && (
        <span
          title="Admin"
          aria-label="Admin"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-bold leading-none"
        >
          A
        </span>
      )}
      <span className="hidden sm:inline text-sm text-text-muted">{profile.displayName}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="cursor-pointer whitespace-nowrap text-xs font-normal text-accent underline underline-offset-2 hover:text-accent-hover transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
