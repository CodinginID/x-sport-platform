import { useAuthStore } from '@/stores/auth';
import type { FeatureKey } from '@/config/features';

/**
 * Apakah studio punya entitlement fitur premium `key`.
 * Superadmin selalu true (untuk preview/QA).
 */
export function useFeature(key: FeatureKey): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const features = useAuthStore((s) => s.licenseInfo?.features);
  if (role === 'superadmin') return true;
  return Array.isArray(features) && features.includes(key);
}
