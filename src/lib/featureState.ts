import type { FeatureEntry } from '@/types';

export type FeatureStateName = 'locked' | 'trial' | 'trial_expired' | 'active';
export interface FeatureStateResult { state: FeatureStateName; trialDaysLeft: number; }

/** Tentukan status fitur dari map entitlement. `nowISO` di-inject agar mudah dites. */
export function featureState(
  features: Record<string, FeatureEntry> | undefined,
  key: string,
  nowISO: string,
): FeatureStateResult {
  const entry = features?.[key];
  if (!entry) return { state: 'locked', trialDaysLeft: 0 };
  if (entry.status === 'active') return { state: 'active', trialDaysLeft: 0 };

  // Trial masih berjalan?
  const ends = entry.trial_ends_at ? new Date(entry.trial_ends_at).getTime() : 0;
  const now = new Date(nowISO).getTime();
  if (entry.status === 'trial' && entry.trial_ends_at && now < ends) {
    return { state: 'trial', trialDaysLeft: Math.ceil((ends - now) / 86_400_000) };
  }

  // Entry ada tapi tidak aktif & trial tidak berjalan → sudah pernah trial / dicabut → HARUS BAYAR.
  // (Sekali pernah trial, tidak ditawari gratis lagi.)
  return { state: 'trial_expired', trialDaysLeft: 0 };
}
