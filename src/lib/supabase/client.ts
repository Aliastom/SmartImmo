'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

// Singleton pattern pour éviter de créer plusieurs instances
let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const createSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient<Database>()
  }
  return supabaseInstance
}
