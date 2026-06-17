# Pro — Kartu Member/Coach + percantik Coach & Paket

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle`.

**Goal:** Kartu ID (member & coach) ber-QR sebagai fitur **Pro**, + lapisan Pro insight di halaman Coach & Paket, + detail dipercantik. Fungsi inti tetap gratis. `qrcode.react` sudah terpasang.

**Prinsip:** tanpa pro = tampilan normal (tidak ada regresi). Gated `useFeature('pro')`. Build hijau tiap task. JANGAN push/printer/DB.

---

## Task 1: Komponen kartu reusable
**Create:** `src/components/EntityCard.tsx`
- `<EntityCard variant="member"|"coach" title studioName name subtitle infoRows qrValue />` — kartu gaya ID-card: header nama studio, avatar/inisial, nama besar, subtitle (ID dipersingkat), beberapa baris info, **QR** (pakai `import { QRCodeSVG } from 'qrcode.react'`) isi `qrValue`. Gradient zen (bg-zen-brand → variasi), rounded-3xl, ukuran proporsi kartu (mis. max-w-sm). Read-only/presentational.

## Task 2: MemberCard di detail member
**Modify:** `src/modules/members/MemberDetailPage.tsx`
- Tambah section/tab **"Kartu"** yang hanya untuk pro (`useFeature('pro')`). Render `<EntityCard variant="member" studioName={studio.name} name={member.full_name} subtitle={'ID ' + member_id pendek} infoRows=[paket aktif+sisa sesi (dari packages), tgl gabung, status] qrValue={member.member_id} />`. Studio name dari `useStudioStore`.
- Tanpa pro: tab Kartu tidak muncul / tampilkan ajakan singkat (fallback). Tab existing dipercantik seperlunya (spacing/heading) tanpa mengubah fungsi.

## Task 3: CoachDetailSheet + CoachCard
**Create:** `src/modules/coaches/CoachDetailSheet.tsx` (pakai `DetailSheet`/`DetailSection`).
**Modify:** `src/modules/coaches/CoachesPage.tsx` — baris coach bisa diklik → buka CoachDetailSheet (info: kontak, komisi reguler/pribadi, status) + bila pro tampilkan `<EntityCard variant="coach" .../>` qrValue={coach_id}. Tetap pertahankan aksi edit/arsip existing.

## Task 4: Pro insight di list Coach & Paket
**Modify:** `src/modules/coaches/CoachesPage.tsx`, `src/modules/packages/PackagesPage.tsx`
- isPro → blok ringkasan di atas list. Coach: jumlah coach aktif, rata-rata komisi reguler/pribadi. Paket: jumlah paket, distribusi reguler/pribadi, harga rata-rata. Pakai data hook yang sudah ada. Tanpa pro = seperti sekarang.

## Task 5: Verifikasi
- [ ] `npm run build && npx vitest run` — build hijau (qrcode.react terpasang); test tidak bertambah gagal (baseline 8).
- [ ] Tanpa pro: detail & list seperti sekarang. Dengan pro: kartu + insight muncul.

## Catatan
- Commit per task path spesifik. JANGAN git add -A/push/printer/migration/superadmin files/npm install. qrcode.react sudah terpasang (lead).
- Jaga file < 500 baris; EntityCard reusable untuk member & coach.
