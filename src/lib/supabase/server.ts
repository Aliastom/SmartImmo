import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Ce client Supabase est destiné à être utilisé côté serveur (API routes, Server Components)
export const createClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
