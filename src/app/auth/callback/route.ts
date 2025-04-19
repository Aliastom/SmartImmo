import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Ensure this route is processed dynamically
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent('Authentification échouée')}`, request.url)
      )
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si pas de code, rediriger vers la page de login
  return NextResponse.redirect(
    new URL(`/auth/login?error=${encodeURIComponent('Code d\'authentification manquant')}`, request.url)
  )
}
