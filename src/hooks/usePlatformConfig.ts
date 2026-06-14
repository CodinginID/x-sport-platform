import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PlatformConfig } from '@/types';

/** Baca konfigurasi global add-on (single-row platform_config). Anon boleh baca. */
export function usePlatformConfig() {
  return useQuery({
    queryKey: ['platformConfig'],
    queryFn: async (): Promise<PlatformConfig | null> => {
      const { data, error } = await supabase.from('platform_config').select('*').eq('id', 1).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as PlatformConfig) ?? null;
    },
  });
}
