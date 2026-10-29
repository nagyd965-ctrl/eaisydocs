import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSafeRedirectPath } from "@/utils/url"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: _options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options: _options }) =>
            supabaseResponse.cookies.set(name, value, _options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes that require authentication
  const isProtectedRoute = request.nextUrl.pathname === '/' ||
                           request.nextUrl.pathname.startsWith('/inbox') || 
                           request.nextUrl.pathname.startsWith('/dossiers') ||
                           request.nextUrl.pathname.startsWith('/search') ||
                           request.nextUrl.pathname.startsWith('/archive') ||
                           request.nextUrl.pathname.startsWith('/admin') ||
                           request.nextUrl.pathname.startsWith('/partners') ||
                           request.nextUrl.pathname.startsWith('/tasks') ||
                           request.nextUrl.pathname.startsWith('/settings') ||
                           request.nextUrl.pathname.startsWith('/security-policy') ||
                           request.nextUrl.pathname.startsWith('/documents') ||
                           request.nextUrl.pathname.startsWith('/hr')

  // Default redirect for unauthenticated users on protected routes
  if (!user && isProtectedRoute) {
    // Vissza a loginra — közben megjegyezzük az eredeti célt (?next=),
    // hogy a sikeres belépés után a felhasználó pont oda kerüljön vissza
    // (pl. e-mailben kapott értesítési link).
    const url = request.nextUrl.clone()
    const originalPath = request.nextUrl.pathname + (request.nextUrl.search || "")
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', originalPath)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === '/login') {
    // Ha már be van lépve és konkrét célja volt (?next=), egyenesen oda küldjük
    const next = getSafeRedirectPath(request.nextUrl.searchParams.get('next'))
    const url = request.nextUrl.clone()
    url.pathname = next || '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
