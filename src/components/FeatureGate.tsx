import type { ReactNode } from 'react';
import { useFeature } from '@/hooks/useFeature';
import type { FeatureKey } from '@/config/features';

/**
 * Render `children` hanya bila studio punya fitur `feature`.
 * Selain itu render `fallback` (default null).
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const enabled = useFeature(feature);
  return <>{enabled ? children : fallback}</>;
}
