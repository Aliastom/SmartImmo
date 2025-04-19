import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createMiddlewareClient<Database>({ req: request, res: response })

  const { data: { session } } = await supabase.auth.getSession()

  // Si on est sur une route publique et qu'on est connecté, rediriger vers le dashboard
  if (PUBLIC_ROUTES.includes(request.nextUrl.pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si on n'est pas sur une route publique et qu'on n'est pas connecté, rediriger vers le login
  if (!PUBLIC_ROUTES.includes(request.nextUrl.pathname) && !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Si on est à la racine, rediriger vers le dashboard
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Specify which routes should be protected by the middleware
export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/properties',
    '/properties/:path*',
    '/tenants',
    '/tenants/:path*',
    '/transactions',
    '/transactions/:path*',
    '/impots',
    '/impots/:path*',
    '/settings',
    '/settings/:path*',
    '/auth/login',
    '/auth/register',
  ],
}
