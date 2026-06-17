import { useMemo } from 'react';
import { FEATURES, FEATURE_KEYS, type FeatureKey } from '@/config/features';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import type { FeatureCatalogEntry } from '@/types';

/**
 * Hook untuk mendapatkan fitur add-on yang aktif (is_publish === true).
 * Fallback ke hardcoded FEATURES jika catalog belum tersedia.
 */
export function usePublishedFeatures() {
  const { data: config } = usePlatformConfig();

  const features = useMemo(() => {
    const catalog = config?.feature_catalog;

    // Jika catalog sudah ada, gunakan itu (walaupun semua disabled)
    if (catalog && Object.keys(catalog).length > 0) {
      const published = Object.entries(catalog)
        .filter(([, entry]) => entry.is_publish)
        .sort((a, b) => a[1].sort_order - b[1].sort_order);

      const result: Record<string, typeof FEATURES[keyof typeof FEATURES]> = {};
      const keys: string[] = [];

      for (const [key, entry] of published) {
        result[key] = {
          label: entry.label,
          description: entry.description,
          trial_days: entry.trial_days,
          details: entry.details,
        } as unknown as typeof FEATURES[keyof typeof FEATURES];
        keys.push(key);
      }

      return { features: result, keys: keys as FeatureKey[] };
    }

    // Fallback ke hardcoded hanya jika belum ada catalog sama sekali
    return { features: FEATURES, keys: FEATURE_KEYS };
  }, [config]);

  return features;
}

/**
 * Helper untuk mendapatkan harga dari config atau fallback ke catalog.
 */
export function useFeaturePrice(key: FeatureKey): number | null {
  const { data: config } = usePlatformConfig();

  return useMemo(() => {
    // Price dari feature_catalog (prioritas)
    const catalog = config?.feature_catalog;
    if (catalog?.[key]) return catalog[key].price;

    // Fallback ke feature_prices
    return config?.feature_prices?.[key] ?? null;
  }, [config, key]);
}
