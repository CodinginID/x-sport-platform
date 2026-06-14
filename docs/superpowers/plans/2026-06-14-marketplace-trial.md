# Marketplace Add-on + Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Menu marketplace `/addons` (owner-only) untuk fitur premium dengan trial self-serve (sekali per fitur, default 3 hari) lalu beli via konfirmasi WhatsApp → diaktifkan superadmin. Revisi model `features` dari `string[]` ke object ber-status.

**Architecture:** `licenses.features` jsonb object `{ key: { status, trial_ends_at?, trial_used? } }`, ikut payload `validateLicense`. Helper murni `featureState()` menentukan locked/trial/trial_expired/active. Trial dimulai via RPC `start_feature_trial` (security definer, sekali-per-fitur). Aktivasi `active` oleh superadmin. HANYA fitur add-on; fitur inti tidak disentuh.

**Tech Stack:** React+TS, Zustand, Supabase plpgsql, Vitest. Komentar Indonesia.

**Spec:** `docs/superpowers/specs/2026-06-14-marketplace-trial-design.md`

**Branch:** `feature/entitlement-framework` (lanjutan, belum merge).

---

## File Structure
| File | Aksi | Tanggung jawab |
|---|---|---|
| `supabase/migrations/20260614000002_features_object_and_trial.sql` | Create | features default `{}` + reset `[]`→`{}` + RPC `start_feature_trial` |
| `src/types/index.ts` | Modify | `LicenseInfo.features` → object; tipe `FeatureEntry` |
| `src/config/features.ts` | Modify | trial_days, price, ADMIN_WA |
| `src/lib/featureState.ts` | Create | `featureState()` murni + tipe `FeatureState` |
| `src/test/featureState.test.ts` | Create | Unit test featureState |
| `src/hooks/useFeature.ts` | Modify | Pakai featureState |
| `src/test/useFeature.test.ts` | Modify | Fixture object model |
| `src/hooks/useFeatureTrial.ts` | Create | Mutation RPC start_feature_trial + refresh lisensi |
| `src/modules/addons/AddonsPage.tsx` | Create | Halaman marketplace + modal beli |
| `src/App.tsx` | Modify | Route `/addons` (owner-only) |
| `src/layouts/AppLayout.tsx` | Modify | Menu nav "Add-on" (owner) |
| `src/modules/superadmin/LicensesPage.tsx` | Modify | Panel status-aware (locked/trial/active) |

---

## Task 1: Migration — features object + RPC trial

**Files:** Create `supabase/migrations/20260614000002_features_object_and_trial.sql`

- [ ] **Step 1: Tulis migration**
```sql
-- ============================================================
-- features: dari array → object ber-status. App belum ada user → reset aman.
-- + RPC start_feature_trial (self-serve, sekali per fitur).
-- ============================================================
alter table licenses alter column features set default '{}'::jsonb;
update licenses set features = '{}'::jsonb where jsonb_typeof(features) <> 'object';

create or replace function start_feature_trial(
  p_license_id  uuid,
  p_feature     text,
  p_trial_days  int,
  p_studio_id   uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_features jsonb;
  v_entry    jsonb;
begin
  select features into v_features from licenses
  where id = p_license_id and id = p_studio_id;
  if not found then raise exception 'Lisensi tidak ditemukan'; end if;

  v_entry := v_features -> p_feature;
  if v_entry is not null and coalesce((v_entry->>'trial_used')::boolean, false) then
    raise exception 'Trial sudah pernah dipakai';
  end if;
  if v_entry is not null and (v_entry->>'status') = 'active' then
    raise exception 'Fitur sudah aktif';
  end if;

  v_features := jsonb_set(
    coalesce(v_features, '{}'::jsonb),
    array[p_feature],
    jsonb_build_object(
      'status', 'trial',
      'trial_ends_at', to_char((now() + make_interval(days => p_trial_days)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'trial_used', true
    ),
    true
  );
  update licenses set features = v_features where id = p_license_id;
  return jsonb_build_object('ok', true);
end;
$$;
```
> Catatan: `id = p_studio_id` karena untuk studio, `studioId` = `licenses.id` (lihat auth store: studioId di-set dari license id).

- [ ] **Step 2: Apply** `supabase db push`. Verifikasi `supabase migration list` ada `20260614000002`.
- [ ] **Step 3: Commit** `git add supabase/migrations/20260614000002_features_object_and_trial.sql && git commit -m "feat(db): features object + RPC start_feature_trial"`

---

## Task 2: Types

**Files:** Modify `src/types/index.ts`

- [ ] **Step 1:** Ganti `features: string[];` di `LicenseInfo` jadi:
```ts
  features: Record<string, FeatureEntry>;
```
- [ ] **Step 2:** Tambah tipe (dekat LicenseInfo):
```ts
export interface FeatureEntry {
  status: 'trial' | 'active';
  trial_ends_at?: string;
  trial_used?: boolean;
}
```
- [ ] **Step 3:** `npx tsc --noEmit` — akan ada error di useFeature/LicensesPage (dibereskan task berikut). Commit di akhir Task 3.

---

## Task 3: Katalog fitur (revisi)

**Files:** Modify `src/config/features.ts`

- [ ] **Step 1: Ganti isi**
```ts
// Sumber kebenaran daftar fitur premium add-on.
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
    trial_days: 3,
    price: 99000, // Rp — TODO: konfirmasi harga final ke user
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

// Nomor WhatsApp admin untuk konfirmasi pembayaran add-on.
// TODO: ganti dengan nomor asli (format internasional tanpa +, mis. 628123456789).
export const ADMIN_WA = '628000000000';
```
- [ ] **Step 2: Commit** `git add src/types/index.ts src/config/features.ts && git commit -m "feat: tipe FeatureEntry + katalog trial_days/price/WA"`

---

## Task 4: Helper `featureState` + test (TDD)

**Files:** Create `src/lib/featureState.ts`, `src/test/featureState.test.ts`

- [ ] **Step 1: Tulis test gagal**
```ts
import { describe, it, expect } from 'vitest';
import { featureState } from '@/lib/featureState';

const NOW = '2026-06-14T00:00:00Z';

describe('featureState', () => {
  it('locked bila key tidak ada', () => {
    expect(featureState({}, 'premium_booking', NOW).state).toBe('locked');
  });
  it('active bila status active', () => {
    expect(featureState({ premium_booking: { status: 'active' } }, 'premium_booking', NOW).state).toBe('active');
  });
  it('trial bila status trial & belum lewat', () => {
    const r = featureState({ premium_booking: { status: 'trial', trial_ends_at: '2026-06-16T00:00:00Z' } }, 'premium_booking', NOW);
    expect(r.state).toBe('trial');
    expect(r.trialDaysLeft).toBe(2);
  });
  it('trial_expired bila sudah lewat', () => {
    expect(featureState({ premium_booking: { status: 'trial', trial_ends_at: '2026-06-13T00:00:00Z' } }, 'premium_booking', NOW).state).toBe('trial_expired');
  });
});
```
- [ ] **Step 2: Jalankan, pastikan GAGAL** — `npx vitest run src/test/featureState.test.ts`
- [ ] **Step 3: Implement**
```ts
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
  // trial
  const ends = entry.trial_ends_at ? new Date(entry.trial_ends_at).getTime() : 0;
  const now = new Date(nowISO).getTime();
  if (now >= ends) return { state: 'trial_expired', trialDaysLeft: 0 };
  const daysLeft = Math.ceil((ends - now) / 86_400_000);
  return { state: 'trial', trialDaysLeft: daysLeft };
}
```
- [ ] **Step 4: Jalankan, pastikan LULUS** (4 test).
- [ ] **Step 5: Commit** `git add src/lib/featureState.ts src/test/featureState.test.ts && git commit -m "feat(lib): featureState + test"`

---

## Task 5: `useFeature` (revisi) + test

**Files:** Modify `src/hooks/useFeature.ts`, `src/test/useFeature.test.ts`

- [ ] **Step 1: Ganti useFeature**
```ts
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
```
- [ ] **Step 2: Ganti test fixtures** `src/test/useFeature.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeature } from '@/hooks/useFeature';
import { useAuthStore } from '@/stores/auth';

function setAuth(p: Record<string, unknown>) { useAuthStore.setState(p as never); }
const future = '2999-01-01T00:00:00Z';
const past = '2000-01-01T00:00:00Z';

describe('useFeature', () => {
  beforeEach(() => setAuth({ user: { role: 'owner' }, licenseInfo: null }));

  it('false bila tidak ada licenseInfo', () => {
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(false);
  });
  it('false bila locked', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: {} } });
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(false);
  });
  it('true bila active', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { premium_booking: { status: 'active' } } } });
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(true);
  });
  it('true bila trial berjalan', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { premium_booking: { status: 'trial', trial_ends_at: future } } } });
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(true);
  });
  it('false bila trial habis', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { premium_booking: { status: 'trial', trial_ends_at: past } } } });
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(false);
  });
  it('superadmin selalu true', () => {
    setAuth({ user: { role: 'superadmin' }, licenseInfo: null });
    expect(renderHook(() => useFeature('premium_booking')).result.current).toBe(true);
  });
});
```
- [ ] **Step 3:** `npx vitest run src/test/useFeature.test.ts` → PASS (6).
- [ ] **Step 4: Commit** `git add src/hooks/useFeature.ts src/test/useFeature.test.ts && git commit -m "refactor(hooks): useFeature pakai featureState"`

---

## Task 6: Hook trial `useFeatureTrial`

**Files:** Create `src/hooks/useFeatureTrial.ts`

Pola: panggil RPC, lalu refresh lisensi via `validateLicense` + `updateLicenseInfo` (auth store) agar entitlement terbaru langsung kepakai.

- [ ] **Step 1: Tulis hook**
```ts
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
```
- [ ] **Step 2:** `npm run build` → sukses. Commit `git add src/hooks/useFeatureTrial.ts && git commit -m "feat(hooks): useFeatureTrial (RPC + refresh lisensi)"`

---

## Task 7: Halaman Marketplace `/addons`

**Files:** Create `src/modules/addons/AddonsPage.tsx`

- [ ] **Step 1: Tulis halaman**
```tsx
import { useState } from 'react';
import { Sparkles, Check, Clock, MessageCircle, X } from 'lucide-react';
import { FEATURES, FEATURE_KEYS, ADMIN_WA, type FeatureKey } from '@/config/features';
import { featureState } from '@/lib/featureState';
import { useFeatureTrial } from '@/hooks/useFeatureTrial';
import { useAuthStore } from '@/stores/auth';
import { formatCurrency } from '@/utils';

function buyWaLink(studio: string, licenseKey: string, label: string) {
  const text = `Halo Admin, saya dari studio "${studio}" (lisensi ${licenseKey}) ingin membeli add-on: ${label}.`;
  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`;
}

export default function AddonsPage() {
  const licenseInfo = useAuthStore((s) => s.licenseInfo);
  const { startTrial, pending } = useFeatureTrial();
  const [buyKey, setBuyKey] = useState<FeatureKey | null>(null);
  const nowISO = new Date().toISOString();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles size={22} className="text-zen-brand" />
        <h1 className="text-2xl font-bold">Add-on Premium</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURE_KEYS.map((key) => {
          const f = FEATURES[key];
          const { state, trialDaysLeft } = featureState(licenseInfo?.features, key, nowISO);
          return (
            <div key={key} className="bg-white rounded-3xl border border-zen-ink/5 p-5 space-y-3">
              <div>
                <p className="text-base font-bold text-zen-ink">{f.label}</p>
                <p className="text-xs text-zen-ink/50 mt-0.5 leading-relaxed">{f.description}</p>
              </div>
              <p className="text-lg font-bold text-zen-brand">{formatCurrency(f.price)}</p>

              {state === 'active' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
                  <Check size={14} /> Aktif
                </span>
              )}
              {state === 'trial' && (
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zen-brand">
                    <Clock size={14} /> Trial — sisa {trialDaysLeft} hari
                  </span>
                  <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold">Beli Sekarang</button>
                </div>
              )}
              {state === 'trial_expired' && (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600 font-medium">Trial selesai — beli untuk lanjut.</p>
                  <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold">Beli Sekarang</button>
                </div>
              )}
              {state === 'locked' && (
                <button onClick={() => startTrial(key)} disabled={pending === key}
                  className="w-full py-3 rounded-2xl bg-zen-brand/10 text-zen-brand text-sm font-bold disabled:opacity-50">
                  {pending === key ? 'Memproses...' : `Coba Gratis ${f.trial_days} Hari`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Beli */}
      {buyKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={() => setBuyKey(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Beli {FEATURES[buyKey].label}</p>
              <button onClick={() => setBuyKey(null)}><X size={18} className="text-zen-ink/40" /></button>
            </div>
            <p className="text-2xl font-bold text-zen-brand">{formatCurrency(FEATURES[buyKey].price)}</p>
            <p className="text-xs text-zen-ink/50 leading-relaxed">
              Transfer ke rekening admin, lalu konfirmasi bukti bayar via WhatsApp. Fitur diaktifkan setelah pembayaran diverifikasi.
            </p>
            <a
              href={buyWaLink(licenseInfo?.studio_name ?? '-', licenseInfo?.license_key ?? '-', FEATURES[buyKey].label)}
              target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold"
            >
              <MessageCircle size={16} /> Konfirmasi via WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 2:** `npm run build` → sukses. Commit `git add src/modules/addons/AddonsPage.tsx && git commit -m "feat(addons): halaman marketplace + alur trial/beli WA"`

---

## Task 8: Route + menu nav

**Files:** Modify `src/App.tsx`, `src/layouts/AppLayout.tsx`

- [ ] **Step 1: App.tsx** — tambah lazy import (dekat CommissionsPage):
```ts
const AddonsPage      = lazyWithReload(() => import('@/modules/addons/AddonsPage'));
```
dan route di dalam blok `<Route element={<OwnerGuard />}>` (dekat /commissions):
```tsx
<Route path="/addons" element={<AddonsPage />} />
```
- [ ] **Step 2: AppLayout.tsx** — tambah icon `Sparkles` ke import lucide, lalu item nav (owner-only) di `allNavItems` (setelah commissions/reports):
```tsx
{ label: 'Add-on', icon: Sparkles, path: '/addons', roles: ['owner'] },
```
- [ ] **Step 3:** `npm run build` → sukses. Commit `git add src/App.tsx src/layouts/AppLayout.tsx && git commit -m "feat(nav): route + menu Add-on (owner-only)"`

---

## Task 9: Panel superadmin status-aware

**Files:** Modify `src/modules/superadmin/LicensesPage.tsx`

Panel "Add-on / Fitur Premium" sebelumnya berbasis array (`row.features.includes(key)` + `onToggleFeature(key, on)`). Revisi ke object ber-status.

- [ ] **Step 1:** Ubah tipe `License.features` lokal jadi `Record<string, { status: 'trial'|'active'; trial_ends_at?: string; trial_used?: boolean }>` (atau import `FeatureEntry` dari types). Update `LicenseRow extends License` otomatis ikut.

- [ ] **Step 2:** Ganti prop card `onToggleFeature` jadi dua aksi:
```ts
  onActivateFeature: (key: string) => void;   // set status active
  onRevokeFeature: (key: string) => void;     // hapus entitlement (locked)
```
Render tiap fitur dengan state via `featureState(row.features, key, new Date().toISOString())` (import dari `@/lib/featureState`). Tampilkan label state (Terkunci/Trial sisa N/Trial habis/Aktif) + tombol **Aktifkan** (bila belum active) & **Cabut** (bila active/trial).

- [ ] **Step 3:** Parent handlers (dekat handleToggleFeature lama — ganti):
```ts
  const writeFeature = async (lic: LicenseRow, key: string, entry: Record<string, unknown> | null) => {
    const cur = (lic.features && typeof lic.features === 'object') ? { ...lic.features } : {};
    if (entry === null) delete (cur as Record<string, unknown>)[key];
    else (cur as Record<string, unknown>)[key] = entry;
    const { error } = await supabase.from('licenses').update({ features: cur }).eq('id', lic.id);
    if (error) { setError('Gagal ubah fitur: ' + error.message); return; }
    await fetchAll();
  };
  const handleActivateFeature = (lic: LicenseRow, key: string) => writeFeature(lic, key, { status: 'active' });
  const handleRevokeFeature = (lic: LicenseRow, key: string) => writeFeature(lic, key, null);
```
Wiring di `<LicenseTableRow ... onActivateFeature={(k)=>handleActivateFeature(row,k)} onRevokeFeature={(k)=>handleRevokeFeature(row,k)} />` (ganti `onToggleFeature`).

- [ ] **Step 4:** Pastikan select query sudah memuat `features` (sudah, dari spec sebelumnya).

- [ ] **Step 5:** `npm run build` → sukses. Commit `git add src/modules/superadmin/LicensesPage.tsx && git commit -m "feat(superadmin): panel fitur status-aware (aktifkan/cabut)"`

---

## Task 10: Verifikasi akhir

- [ ] **Step 1:** `npm run build && npx vitest run`
Expected: build hijau; `featureState.test` (4) & `useFeature.test` (6) lulus; kegagalan lain TIDAK bertambah dari baseline (8 pre-existing: auth ×2, hooks-Dexie ×6).

- [ ] **Step 2: Smoke manual:**
  1. Owner → menu Add-on → "Coba Gratis 3 Hari" → fitur aktif, badge Premium muncul di Booking.
  2. Klik "Coba" lagi (fitur sama) → ditolak "Trial sudah pernah dipakai".
  3. (Simulasi) set `trial_ends_at` lampau via DB → kartu jadi "Trial selesai", badge hilang.
  4. "Beli Sekarang" → modal → tombol WhatsApp link benar (nomor + studio + fitur).
  5. Superadmin → Lisensi → Aktifkan fitur → owner refresh → status Aktif permanen.

---

## Catatan Eksekusi
- Branch `feature/entitlement-framework`. `supabase db push` aman (belum ada user).
- HANYA fitur add-on; fitur inti tak disentuh.
- TODO data nyata: `ADMIN_WA` & `price` di `features.ts` masih placeholder — konfirmasi ke user.
- JANGAN push ke remote. JANGAN sentuh file printer.
