import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Session-refresh proxy (Next 16 renamed the `middleware` convention to
 * `proxy` — see node_modules/next/dist/docs/.../proxy.md). Runs on every
 * matched request, refreshes the Supabase auth session, and writes any rotated
 * cookies back onto the response. Per the @supabase/ssr guide, an SSR app
 * *must* run this or sessions won't refresh (causing random logouts).
 *
 * Proxy defaults to the Node.js runtime in Next 16, which is what the Supabase
 * client needs.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Touch the session so the library refreshes it and calls setAll if needed.
  // getUser() (not getSession()) validates the JWT.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Run on everything except static assets / image files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
