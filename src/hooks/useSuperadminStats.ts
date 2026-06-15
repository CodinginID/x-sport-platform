import { useMemo } from 'react';
import { featureState } from '@/lib/featureState';
import { daysUntil } from '@/modules/superadmin/types';
import type { LicenseRow } from '@/modules/superadmin/types';

export interface MonthlySignup { label: string; value: number; }
export interface PlanDistribution { plan: string; count: number; }

export interface SuperadminStats {
  total: number;
  active: number;
  online: number;
  pending: number;
  disabled: number;
  /** Lisensi aktif yang akan kedaluwarsa dalam ≤14 hari (tidak termasuk yang sudah expired). */
  expiringSoon: number;
  /** Jumlah lisensi yang memakai fitur Pro (status active/trial). */
  proUsers: number;
  /** Pendaftaran per bulan (12 bulan terakhir) dari created_at. */
  signupsByMonth: MonthlySignup[];
  /** Distribusi plan, diurutkan terbanyak dulu. */
  planDistribution: PlanDistribution[];
  /** List lisensi aktif yang mau expired ≤14 hari, diurut paling dekat dulu. */
  expiringList: LicenseRow[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Hitung semua metrik dashboard superadmin dari rows yang sudah di-fetch. Tidak melakukan query baru. */
export function computeSuperadminStats(rows: LicenseRow[]): SuperadminStats {
  const nowISO = new Date().toISOString();

  const active = rows.filter(r => r.state === 'active');
  const pending = rows.filter(r => r.state === 'pending');
  const disabled = rows.filter(r => r.state === 'disabled');
  const online = rows.filter(r => r.sessionStatus === 'online');

  const expiringList = active
    .filter(r => {
      const d = daysUntil(r.expires_at);
      return d >= 0 && d <= 14;
    })
    .sort((a, b) => daysUntil(a.expires_at) - daysUntil(b.expires_at));

  const proUsers = rows.filter(r => {
    const { state } = featureState(r.features, 'pro', nowISO);
    return state === 'active' || state === 'trial';
  }).length;

  // Pendaftaran per bulan — 12 bulan terakhir.
  const now = new Date();
  const buckets: MonthlySignup[] = [];
  const keyToIndex = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    keyToIndex.set(key, buckets.length);
    buckets.push({ label: MONTH_LABELS[d.getMonth()], value: 0 });
  }
  for (const r of rows) {
    if (!r.created_at) continue;
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = keyToIndex.get(key);
    if (idx !== undefined) buckets[idx].value += 1;
  }

  // Distribusi plan.
  const planMap = new Map<string, number>();
  for (const r of rows) {
    const plan = (r.plan || 'basic').toLowerCase();
    planMap.set(plan, (planMap.get(plan) ?? 0) + 1);
  }
  const planDistribution: PlanDistribution[] = Array.from(planMap.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    active: active.length,
    online: online.length,
    pending: pending.length,
    disabled: disabled.length,
    expiringSoon: expiringList.length,
    proUsers,
    signupsByMonth: buckets,
    planDistribution,
    expiringList,
  };
}

export function useSuperadminStats(rows: LicenseRow[]): SuperadminStats {
  return useMemo(() => computeSuperadminStats(rows), [rows]);
}
