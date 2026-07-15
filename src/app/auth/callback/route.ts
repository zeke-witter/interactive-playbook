import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * OAuth callback. Google redirects here with a `?code`; we exchange it for a
 * session (cookies are written via the server client's setAll, which works in
 * a route handler) and redirect on. On failure, bounce home with a flag.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await getServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
