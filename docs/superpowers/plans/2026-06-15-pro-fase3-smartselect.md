# Paket Pro — Fase 3: Dropdown cantik + skeleton (SmartSelect)

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch: `feature/pro-bundle` (lanjutan).

**Goal:** Komponen `SmartSelect` premium-aware. Saat `pro` aktif → dropdown **searchable + skeleton loading**. Saat tidak → native `<select>` (sama seperti `Select` sekarang). Pasang di dropdown controlled di halaman kunci. Fungsi inti tetap jalan (fallback native).

**Prinsip:** tanpa `pro`, perilaku & tampilan = native select existing (tidak ada regresi). Build hijau tiap task. JANGAN push, JANGAN sentuh DB/printer.

---

## Task 1: Komponen SmartSelect

**Create:** `src/components/ui/SmartSelect.tsx`

API selaras `Select`: `{ label?, error?, value, onChange(value: string), options: {value;label}[], placeholder?, loading?, disabled?, className? }`.
- `const isPro = useFeature('pro')`.
- **Bila TIDAK pro:** render persis seperti `Select` native (label + `<select>` + options + error). `onChange` dipanggil dgn `e.target.value`.
- **Bila pro:** render tombol pemicu + panel dropdown:
  - Input **search** di atas daftar (filter options by label, case-insensitive).
  - Daftar option scrollable, item ter-highlight saat terpilih.
  - **`loading` true → tampilkan skeleton** (beberapa baris `Skeleton` dari `@/components/Skeleton`) menggantikan daftar.
  - Klik luar menutup panel (gunakan handler sederhana / overlay).
  - Gaya zen: rounded-2xl, bg-zen-bg, border focus zen-brand.
- `onChange(value)` — KIRIM string value (bukan event) agar pemanggil seragam. (Catatan: ini beda dari Select native yang pakai e.target.value — pemanggil disesuaikan di Task 2.)

- [ ] Implementasi. `npm run build` hijau.

## Task 2: Pasang SmartSelect di dropdown controlled

Ganti `<Select ... value onChange={e=>...e.target.value}>` → `<SmartSelect ... value onChange={(v)=>...v} loading={isLoadingData}>` di:
- `src/modules/payments/MemberPaymentPage.tsx` — pilih Member (`loading` saat members fetch), metode bayar (opsional, biarkan native—sedikit opsi).
- `src/modules/members/MembersPage.tsx` — pilih paket di modal Beli Paket (`loading` saat catalog fetch).
- `src/modules/bookings/SessionDetailSheet.tsx` — pilih member & member_package (`loading` saat data fetch). Coach select di sini & CreateSessionModal boleh ikut.
- `src/modules/commissions/CommissionsPage.tsx` — filter coach (bila ada).

Catatan: HANYA dropdown yang controlled (punya value/onChange). JANGAN ubah `Select` yang dipakai react-hook-form via `register` (mis. form Member/Paket field) — biarkan native agar RHF tidak rusak.

- [ ] Tiap file: ganti + `npm run build` hijau. Pastikan onChange terima string value.

## Task 3: Verifikasi

- [ ] `npm run build && npx vitest run` — build hijau; test tidak bertambah gagal dari baseline (8).
- [ ] Smoke: tanpa pro → dropdown native seperti biasa. Dengan pro → dropdown searchable + skeleton saat loading.

## Catatan
- Commit per task path spesifik. JANGAN `git add -A`, JANGAN push, JANGAN sentuh printer/DB/migration.
- Pastikan import `useFeature` & `Skeleton` benar.
