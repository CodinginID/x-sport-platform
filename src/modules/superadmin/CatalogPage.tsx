import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { useToastStore } from '@/stores/toast';
import { FeatureCatalogManager } from './FeatureCatalogManager';
import type { PlatformConfig } from '@/types';
import type { createAdminClient } from '@/lib/supabaseAdmin';

type AdminClient = ReturnType<typeof createAdminClient>;

export default function CatalogPage() {
  const { data: config = null, isLoading } = usePlatformConfig();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();

  const handleConfigChange = (_cfg: PlatformConfig) => {
    qc.invalidateQueries({ queryKey: ['platformConfig'] });
    qc.invalidateQueries({ queryKey: ['publishedFeatures'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-7 h-7 border-[3px] border-zen-brand/20 border-t-zen-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FeatureCatalogManager
      adminClient={supabase as unknown as AdminClient}
      config={config}
      onConfigChange={handleConfigChange}
      toast={{ add: addToast }}
    />
  );
}
