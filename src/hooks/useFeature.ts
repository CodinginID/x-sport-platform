import { useAuthStore } from '@/stores/auth';
import { featureState } from '@/lib/featureState';
import type { FeatureKey } from '@/config/features';

/** Apakah fitur premium `key` aktif (active atau trial berjalan). Superadmin selalu true. */
export function useFeature(key: FeatureKey): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const features = useAuthStore((s) => s.licenseInfo?.features);
  if (role === 'superadmin') return true;
  const { state } = featureState(features, key, new Date().toISOString());
  return state === 'active' || state === 'trial';
}
