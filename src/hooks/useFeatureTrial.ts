import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { validateLicense } from '@/services/license';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { FEATURES, type FeatureKey } from '@/config/features';

/** Mulai trial fitur (self-serve) via RPC, lalu refresh lisensi. */
export function useFeatureTrial() {
  const [pending, setPending] = useState<string | null>(null);
  const startTrial = async (key: FeatureKey) => {
    const { licenseInfo, updateLicenseInfo } = useAuthStore.getState();
    if (!licenseInfo) return;
    setPending(key);
    try {
      const { error } = await supabase.rpc('start_feature_trial', {
        p_license_id: licenseInfo.id,
        p_feature: key,
        p_trial_days: FEATURES[key].trial_days,
        p_studio_id: licenseInfo.id,
      });
      if (error) throw new Error(error.message);
      const fresh = await validateLicense(licenseInfo.license_key);
      if (fresh.ok && fresh.data) await updateLicenseInfo(fresh.data);
      useToastStore.getState().addToast(`Trial ${FEATURES[key].label} dimulai`, 'success');
    } catch (e) {
      useToastStore.getState().addToast(e instanceof Error ? e.message : 'Gagal memulai trial', 'error');
    } finally {
      setPending(null);
    }
  };
  return { startTrial, pending };
}
