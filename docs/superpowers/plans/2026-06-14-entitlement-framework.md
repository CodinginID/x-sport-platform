# Entitlement Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Kerangka fitur premium add-on per studio: kolom `licenses.features` (jsonb), helper `useFeature` + `<FeatureGate>`, katalog fitur, dan toggle aktivasi di SuperAdmin. Belum ada fitur premium nyata — hanya rangka + gate placeholder.

**Architecture:** Entitlement = array string fitur di `licenses.features`, ikut payload `validateLicense` (pakai `select('*')`, otomatis). Frontend baca dari `licenseInfo` (auth store) lewat `useFeature`. Superadmin toggle fitur per studio via update langsung ke tabel `licenses` (pola sama seperti approve lisensi existing).

**Tech Stack:** React+TS, Zustand (auth store), Supabase, Vitest. Komentar Indonesia.

**Spec:** `docs/superpowers/specs/2026-06-14-entitlement-premium-addon-design.md`

---

## File Structure
| File | Aksi | Tanggung jawab |
|---|---|---|
| `supabase/migrations/20260614000001_license_features.sql` | Create | Kolom `licenses.features jsonb default '[]'` |
| `src/types/index.ts` | Modify | `LicenseInfo.features: string[]` |
| `src/config/features.ts` | Create | Katalog fitur (sumber kebenaran daftar) |
| `src/hooks/useFeature.ts` | Create | Hook boolean cek entitlement |
| `src/components/FeatureGate.tsx` | Create | Komponen gate render children/fallback |
| `src/test/useFeature.test.ts` | Create | Unit test useFeature |
| `src/modules/superadmin/LicensesPage.tsx` | Modify | Panel toggle fitur per lisensi |

---

## Task 1: Migration kolom `features`

**Files:** Create `supabase/migrations/20260614000001_license_features.sql`

- [ ] **Step 1: Tulis migration**
```sql
-- ============================================================
-- Entitlement fitur premium add-on per studio.
-- features = array string fitur aktif, mis. ["premium_booking"].
-- ============================================================
alter table licenses
  add column if not exists features jsonb not null default '[]'::jsonb;
```

- [ ] **Step 2: Apply ke DB** (app belum ada user → aman)

Run: `supabase db push`
Expected: migration applied. Verifikasi: `supabase migration list` menampilkan `20260614000001`.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260614000001_license_features.sql
git commit -m "feat(db): kolom licenses.features untuk entitlement add-on"
```

---

## Task 2: Type `LicenseInfo.features`

**Files:** Modify `src/types/index.ts` (interface `LicenseInfo`)

- [ ] **Step 1:** Tambah field setelah `plan: string;`:
```ts
  plan: string;
  features: string[];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error baru (validateLicense pakai `select('*')` + cast `as LicenseInfo`, jadi `features` otomatis terbawa).

- [ ] **Step 3: Commit**
```bash
git add src/types/index.ts
git commit -m "feat(types): LicenseInfo.features"
```

---

## Task 3: Katalog fitur

**Files:** Create `src/config/features.ts`

- [ ] **Step 1: Tulis katalog**
```ts
// Sumber kebenaran daftar fitur premium add-on.
// Tambah entry baru di sini untuk menjual fitur baru.
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Daftar key fitur (untuk iterasi UI). */
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
```

- [ ] **Step 2: Commit**
```bash
git add src/config/features.ts
git commit -m "feat(config): katalog fitur premium"
```

---

## Task 4: Hook `useFeature` + test (TDD)

**Files:** Create `src/hooks/useFeature.ts`, `src/test/useFeature.test.ts`

- [ ] **Step 1: Tulis test gagal**

`src/test/useFeature.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeature } from '@/hooks/useFeature';
import { useAuthStore } from '@/stores/auth';

function setAuth(partial: Record<string, unknown>) {
  useAuthStore.setState(partial as never);
}

describe('useFeature', () => {
  beforeEach(() => {
    setAuth({ user: { role: 'owner' }, licenseInfo: null });
  });

  it('false bila tidak ada licenseInfo', () => {
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(false);
  });

  it('false bila fitur tidak ada di features', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: [] } });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(false);
  });

  it('true bila fitur ada di features', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: ['premium_booking'] } });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(true);
  });

  it('superadmin selalu true (preview)', () => {
    setAuth({ user: { role: 'superadmin' }, licenseInfo: null });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `npx vitest run src/test/useFeature.test.ts`
Expected: FAIL (`useFeature` belum ada).

- [ ] **Step 3: Implement**

`src/hooks/useFeature.ts`:
```ts
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
```

- [ ] **Step 4: Jalankan, pastikan LULUS**

Run: `npx vitest run src/test/useFeature.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useFeature.ts src/test/useFeature.test.ts
git commit -m "feat(hooks): useFeature + test"
```

---

## Task 5: Komponen `FeatureGate`

**Files:** Create `src/components/FeatureGate.tsx`

- [ ] **Step 1: Tulis komponen**
```tsx
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
```

- [ ] **Step 2: Build cek**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 3: Commit**
```bash
git add src/components/FeatureGate.tsx
git commit -m "feat(components): FeatureGate"
```

---

## Task 6: Panel toggle fitur di SuperAdmin

**Files:** Modify `src/modules/superadmin/LicensesPage.tsx`

Konteks: LicensesPage sudah update tabel `licenses` langsung via `supabase.from('licenses').update({...}).eq('id', lic.id)` (mis. baris approve `is_active: true`). Tipe `License` lokal di file ini & query select perlu menyertakan `features`.

- [ ] **Step 1:** Baca file, temukan: (a) interface/tipe `License` lokal, (b) query `.select(...)` daftar lisensi (sekitar baris 489), (c) tempat aksi per-lisensi dirender (kartu/detail).

- [ ] **Step 2:** Tambah `features` ke tipe `License` lokal:
```ts
  features?: string[];
```
dan ke string `.select(...)` daftar lisensi (tambahkan `, features`). Pastikan state lisensi memuat `features`.

- [ ] **Step 3:** Tambah fungsi toggle (dekat handler aksi lain di komponen):
```ts
  const toggleFeature = async (lic: License, key: string, on: boolean) => {
    const current = Array.isArray(lic.features) ? lic.features : [];
    const next = on ? Array.from(new Set([...current, key])) : current.filter(f => f !== key);
    const { error } = await supabase.from('licenses').update({ features: next }).eq('id', lic.id);
    if (error) { setError('Gagal ubah fitur: ' + error.message); return; }
    // refresh daftar (panggil fungsi reload yang sudah dipakai setelah approve/disable di file ini)
    await load();
  };
```
> Catatan: ganti `load()` dengan nama fungsi reload daftar yang SUDAH ADA di file ini (lihat yang dipanggil setelah approve). Jangan buat mekanisme refresh baru.

- [ ] **Step 4:** Render panel fitur di kartu/detail tiap lisensi. Import katalog di atas file: `import { FEATURES, FEATURE_KEYS } from '@/config/features';`. Lalu di area aksi lisensi:
```tsx
<div className="mt-3 border-t border-zen-ink/5 pt-3">
  <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Add-on / Fitur Premium</p>
  <div className="space-y-2">
    {FEATURE_KEYS.map((key) => {
      const on = Array.isArray(lic.features) && lic.features.includes(key);
      return (
        <div key={key} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zen-ink truncate">{FEATURES[key].label}</p>
            <p className="text-[11px] text-zen-ink/40 truncate">{FEATURES[key].description}</p>
          </div>
          <button
            onClick={() => toggleFeature(lic, key, !on)}
            className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-zen-brand' : 'bg-zen-ink/15'}`}
            title={on ? 'Nonaktifkan' : 'Aktifkan'}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      );
    })}
  </div>
</div>
```
> Sesuaikan nama variabel lisensi (`lic`) dengan yang dipakai di loop render file tsb.

- [ ] **Step 5: Build cek**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 6: Commit**
```bash
git add src/modules/superadmin/LicensesPage.tsx
git commit -m "feat(superadmin): toggle fitur premium per lisensi"
```

---

## Task 7: Contoh gate placeholder di Booking

**Files:** Modify `src/modules/bookings/BookingsPage.tsx`

Tujuan: buktikan kerangka bekerja TANPA membangun UI premium nyata. Tambah indikator kecil "mode premium" yang hanya tampil bila fitur aktif — UI utama tetap default.

- [ ] **Step 1:** Import di atas file:
```ts
import { FeatureGate } from '@/components/FeatureGate';
import { Sparkles } from 'lucide-react';
```

- [ ] **Step 2:** Di header halaman (dekat judul "Jadwal Sesi"), tambah badge ter-gate. Cari baris `<h1 ...>Jadwal Sesi</h1>` dan bungkus/tambahkan di sebelahnya:
```tsx
<div className="flex items-center gap-2">
  <h1 className="text-2xl font-bold">Jadwal Sesi</h1>
  <FeatureGate feature="premium_booking">
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zen-brand/10 text-zen-brand">
      <Sparkles size={11} /> Premium
    </span>
  </FeatureGate>
</div>
```
> Sesuaikan dengan struktur header existing (jangan duplikasi `<h1>` — ganti yang ada).

- [ ] **Step 3: Build cek**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 4: Commit**
```bash
git add src/modules/bookings/BookingsPage.tsx
git commit -m "feat(booking): gate badge premium (placeholder kerangka)"
```

---

## Task 8: Verifikasi akhir

- [ ] **Step 1:** `npm run build && npx vitest run`
Expected: build hijau; `useFeature.test.ts` lulus (4); jumlah kegagalan lain TIDAK bertambah dari baseline (8 pre-existing: auth ×2, hooks-Dexie ×6).

- [ ] **Step 2: Smoke manual** (DB sudah ada kolom features):
  1. Login superadmin → halaman Lisensi → toggle "Tampilan Booking Premium" ON untuk satu studio.
  2. Login owner studio itu → halaman Jadwal Sesi → badge "Premium" muncul.
  3. Studio lain (fitur OFF) → badge tidak muncul.

---

## Catatan Eksekusi
- Branch `feature/entitlement-framework` (dari `release/prod` yang sudah berisi jadwal-sesi).
- Migration aman di-apply (belum ada user). `supabase db push`.
- JANGAN push ke remote (user testing dulu).
- Fitur premium NYATA (availability finder) = spec/plan terpisah; di sini cuma kerangka + gate placeholder.
