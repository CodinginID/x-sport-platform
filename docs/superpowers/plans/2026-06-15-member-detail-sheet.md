# Member Detail → Sheet (seperti Coach)

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle`.

**Goal:** Detail member jadi slide-over **DetailSheet** (view-only) seperti `CoachDetailSheet`, dibuka dari baris MembersPage — bukan halaman bertab. Kartu (EntityCard) jadi hero bila Pro. Build hijau. JANGAN push/printer/DB.

**Prinsip:** view-only & simpel; fungsi yang masih perlu (batalkan paket pending) dipertahankan. Tanpa Pro tetap normal (tanpa kartu).

---

## Task 1: Komponen MemberDetailSheet
**Create:** `src/modules/members/MemberDetailSheet.tsx` (pola `CoachDetailSheet` + `DetailSheet`/`DetailRow`/`DetailSection`).
Props: `{ member: Member | null; onClose: () => void }`.
Isi:
- Bila Pro → `<EntityCard variant="member" ...>` (studioName useStudioStore, info paket aktif+sisa sesi, tgl gabung, status, qrValue=member_id) sebagai hero. Bila tidak → avatar+nama+status biasa.
- DetailSection "Kontak": phone, email, alamat (DetailRow).
- DetailSection "Ringkasan": total booking, hadir, total dibayar (hitung dari hooks).
- DetailSection "Paket": daftar member_packages (nama, status badge, sisa/total sesi); paket `pending` ada tombol "Batalkan" (pakai `useCancelPendingPackage`).
Data: `useMemberPackages(member.member_id)`, `useBookings({member_id})`, `useMemberPayments({member_id})`, `usePackages` (nama paket). Import dari @/hooks.

## Task 2: Wire MembersPage buka sheet
**Modify:** `src/modules/members/MembersPage.tsx`
- Baris member: klik → buka MemberDetailSheet (state `detailMember`), BUKAN `navigate('/members/:id')`. Pertahankan tombol Beli Paket / edit / arsip di baris.
- Render `<MemberDetailSheet member={detailMember} onClose={()=>setDetailMember(null)} />`.

## Task 3: Bersihkan route lama (opsional aman)
**Modify:** `src/App.tsx` — boleh hapus route `/members/:id` + lazy import MemberDetailPage; ATAU biarkan (deep-link). Bila dihapus, hapus juga file MemberDetailPage.tsx agar tak ada kode mati. Pilih: HAPUS route + file MemberDetailPage (karena diganti sheet) untuk hindari dua UI divergen. Pastikan tidak ada import tersisa ke MemberDetailPage.

## Task 4: Verifikasi
- [ ] `npm run build && npx vitest run` — build hijau; test tidak bertambah gagal (baseline 8). `grep -rn "MemberDetailPage\|members/:id" src/` bersih bila dihapus.
- [ ] Klik member → sheet muncul (kartu bila pro), batalkan pending jalan, tanpa pro normal.

## Catatan
- Commit per task path spesifik. JANGAN git add -A/push/printer/migration/superadmin/npm install.
