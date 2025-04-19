import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { session } = await request.json()
    
    // Get the cookies from the request
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    if (session) {
      // Set the session cookie
      await supabase.auth.setSession(session)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error syncing session:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
