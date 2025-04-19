'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createServerSupabaseClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookies().get(name)?.value
        },
        set(name, value, options) {
          try {
            cookies().set(name, value, { ...options, path: '/' })
          } catch (error) {
            // Handle cookie setting errors silently in production
            console.error('Error setting cookie:', error)
          }
        },
        remove(name, options) {
          try {
            cookies().set(name, '', { ...options, maxAge: 0, path: '/' })
          } catch (error) {
            // Handle cookie removal errors silently in production
            console.error('Error removing cookie:', error)
          }
        }
      }
    }
  )
}
