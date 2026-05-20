import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cjiopascmwicdibaqeve.supabase.co';

export function createAdminClient(serviceKey: string) {
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}
