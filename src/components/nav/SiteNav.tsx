'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthButton } from '@/components/auth/AuthButton'
import type { CurrentProfile } from '@/lib/supabase/server'

/** Nav items render as soft-background buttons with lime text (light weight).
 *  Fixed height + inline-flex centering keeps them aligned with the auth cluster. */
const LINK =
  'inline-flex items-center h-8 rounded-md bg-surface-raised px-3 text-sm font-normal leading-none text-accent hover:bg-surface hover:text-accent-hover transition-colors'

/**
 * Global top nav. Brand (left) returns to the viewer/home. Right: lime text
 * links for Designer, Manage plays, Manage team (as permitted), and the auth
 * control. The link for the section you're already in is hidden.
 */
export function SiteNav({ profile }: { profile: CurrentProfile | null }) {
  const pathname = usePathname()
  const inDesigner = pathname.startsWith('/designer')
  const inManagePlays = pathname.startsWith('/my-playbook')

  return (
    <header className="flex-none flex items-center gap-3 border-b border-border bg-bg px-4 h-12">
      <Link
        href="/"
        className="font-display text-sm font-bold uppercase tracking-wide text-text hover:text-accent transition-colors"
      >
        Ultimate Playbook
      </Link>
      <div className="flex-1" />

      {!inDesigner && (
        <Link href="/designer" className={LINK}>
          Designer
        </Link>
      )}
      {profile && !inManagePlays && (
        <Link href="/my-playbook" className={LINK}>
          Manage plays
        </Link>
      )}
      {profile?.canManage && (
        <Link href="/team" className={LINK}>
          Manage team
        </Link>
      )}
      <AuthButton profile={profile} />
    </header>
  )
}
