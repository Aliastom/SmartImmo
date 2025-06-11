import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Ce client Supabase est destiné à être utilisé côté client (React components)
export const supabase = createClientComponentClient();
