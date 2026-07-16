'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthButton } from '@/components/auth/AuthButton'
import type { CurrentProfile } from '@/lib/supabase/server'

const NAV_LINK =
  'whitespace-nowrap rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-text shadow-sm transition-all duration-150 hover:bg-surface hover:shadow-md active:scale-[0.98]'

/**
 * Global top nav. Left: brand/home. Right: a context-aware primary link
 * (Designer everywhere except inside the Designer, where it flips to My
 * Playbook), Manage team (captains/admin), and the auth control. Slim so it
 * sits above the full-screen viewer/designer shells without crowding them.
 */
export function SiteNav({ profile }: { profile: CurrentProfile | null }) {
  const pathname = usePathname()
  const inDesigner = pathname.startsWith('/designer')

  return (
    <header className="flex-none flex items-center gap-3 border-b border-border bg-bg px-4 h-12">
      <Link href="/" className="font-display text-sm font-bold uppercase tracking-wide text-text hover:text-accent transition-colors">
        Mousetrap
      </Link>
      <div className="flex-1" />

      {inDesigner ? (
        profile && (
          <Link href="/my-playbook" className={NAV_LINK}>
            My Playbook
          </Link>
        )
      ) : (
        <Link href="/designer" className={NAV_LINK}>
          Designer
        </Link>
      )}
      {profile?.canManage && (
        <Link href="/team" className={NAV_LINK}>
          Manage team
        </Link>
      )}
      <AuthButton profile={profile} />
    </header>
  )
}
