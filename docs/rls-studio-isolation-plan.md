# Rencana: Pengerasan RLS dengan Studio Isolation (JWT `studio_id` claim)

> Status: **PERENCANAAN** — belum diimplementasikan. Untuk dikerjakan di kemudian hari.
> Kondisi saat ini: RLS aktif tapi **permisif** (`using(true) / with check(true)`) di semua tabel studio.
> Lihat migration `supabase/migrations/20260608000007_studio_tables_rls.sql`.

---

## 1. Masalah yang diselesaikan

Saat ini aplikasi adalah **SPA tanpa backend** yang langsung mengakses Supabase memakai **anon key publik** (hardcoded di `src/lib/supabase.ts`). Isolasi antar-tenant (studio) **hanya dilakukan di sisi client** lewat `.eq('studio_id', studioId)` di setiap query.

Implikasi keamanan:

- Anon key ikut ter-bundle ke frontend → siapa pun bisa mengekstraknya.
- RLS permisif (`using(true)`) → siapa pun dengan anon key bisa **membaca/menulis data studio mana pun** asal tahu/menebak `studio_id` (UUID).
- Tidak ada penegakan tenant di server. "Keamanan" multi-tenant saat ini = kepercayaan pada client.

Tujuan dokumen ini: menegakkan isolasi `studio_id` **di sisi server** lewat RLS yang membaca claim dari JWT.

---

## 2. Kenapa ini bukan perubahan kecil

Akarnya **struktural**:

1. **Tidak ada Supabase Auth.** Auth dibuat sendiri — `password_hash` di tabel `license_users`/`users`, diverifikasi di client (`verifyPassword` di `src/stores/auth.ts`), session = baris di tabel `sessions` + cookie `session_id`.
2. **Tidak ada backend.** Tidak ada tempat aman untuk menyimpan **JWT secret** Supabase atau menerbitkan token tepercaya. JWT yang berisi claim `studio_id` **wajib ditandatangani dengan secret server** yang tidak boleh bocor ke frontend.

Maka apa pun jalurnya, kita harus menambah satu komponen tepercaya (server) ATAU mengadopsi sistem auth Supabase.

---

## 3. Pilihan arsitektur

### Jalur A — Adopsi Supabase Auth (GoTrue)
`studio_id` disimpan di `app_metadata` user → otomatis ada di JWT → RLS membaca `auth.jwt()`.

- **Pro:** Token & refresh dikelola Supabase. Idiomatik. Tidak perlu menulis kode signing sendiri.
- **Kontra:** Harus **migrasi semua user** `license_users`/`users` → `auth.users`. Password hash custom kemungkinan **tidak bisa dimigrasi** (perlu flow reset/set-password). Harus **menulis ulang** `login/logout/validateSession`, logika 1-device-per-license, login-by-username, superadmin-from-env, alur aktivasi lisensi.
- **Ukuran: BESAR** (≈ beberapa hari + testing menyeluruh). Praktis menulis ulang subsistem auth + lisensi yang baru saja dirapikan.

### Jalur B — JWT custom via Edge Function (REKOMENDASI) ✅
Pertahankan auth buatan sendiri. Saat login, **Supabase Edge Function** menerbitkan JWT (berisi `studio_id`, `role`, `user_email`) yang **ditandatangani dengan JWT secret**. Client memakai token itu sebagai access token. RLS membaca `auth.jwt()`.

- **Pro:** **Tidak** perlu migrasi user. Tetap pakai flow login/lisensi/sessions yang sudah ada. Perubahan client minimal (cara meng-attach token). Bisa diterapkan bertahap, tabel per tabel.
- **Kontra:** Memperkenalkan komponen backend pertama (Edge Function) + manajemen secret + deployment. Perlu menangani expiry/refresh token sendiri.
- **Ukuran: SEDANG** (≈ 1–2 hari).

**Keputusan: tempuh Jalur B.** Sisa dokumen ini fokus ke Jalur B.

---

## 4. Desain Jalur B (target arsitektur)

```
┌────────────┐   email+password   ┌──────────────────────┐
│  Client    │ ─────────────────▶ │ Edge Function:       │
│  (SPA)     │                    │   issue-studio-token │
│            │ ◀───────────────── │  - verifikasi kredensial (atau session id)
│            │   signed JWT       │  - sign JWT { sub, studio_id, role, email }
└─────┬──────┘                    │    dengan SUPABASE_JWT_SECRET
      │ Authorization: Bearer JWT └──────────────────────┘
      ▼
┌────────────────────────┐
│ Supabase PostgREST/RLS │  policy: studio_id = (auth.jwt() ->> 'studio_id')::uuid
└────────────────────────┘
```

### Isi JWT (claims)
```json
{
  "sub": "<user_db_id atau email>",
  "role": "authenticated",          // wajib agar PostgREST memperlakukan sebagai user login
  "studio_id": "<uuid lisensi>",
  "user_role": "owner | staff",
  "email": "<email user>",
  "iat": <issued at>,
  "exp": <expiry — samakan dgn masa berlaku session: 1 atau 30 hari>
}
```

---

## 5. Langkah implementasi (urut, bisa bertahap)

### Tahap 0 — Persiapan & flag
- [ ] Ambil **JWT secret** dari Supabase Dashboard → Settings → API → JWT Settings → "JWT Secret". Simpan sebagai secret Edge Function (`supabase secrets set SUPABASE_JWT_SECRET=...`). **Jangan** taruh di `.env` frontend.
- [ ] Catat: pendekatan rollout **non-destruktif** — policy `studio_id`-scoped akan menerima JWT valid. Selama transisi, kita bisa biarkan anon tetap diizinkan per-tabel lalu cabut satu per satu (lihat Tahap 4).

### Tahap 1 — Edge Function penerbit token
- [ ] Buat `supabase/functions/issue-studio-token/index.ts`.
- [ ] Input: email + password **atau** `session_id` yang sudah ada (lebih aman: terima `session_id` yang baru dibuat `login()`, verifikasi ke tabel `sessions`, lalu terbitkan JWT — menghindari menaruh logika verifikasi password di dua tempat).
- [ ] Verifikasi kredensial/sesi, lalu sign JWT memakai `SUPABASE_JWT_SECRET` (HS256). Sketsa:

```ts
import { create } from "https://deno.land/x/djwt/mod.ts";

const secret = Deno.env.get("SUPABASE_JWT_SECRET")!;
const key = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
);

// setelah verifikasi session/kredensial dan dapat { studioId, role, email, userId, expSec }
const jwt = await create(
  { alg: "HS256", typ: "JWT" },
  { sub: userId, role: "authenticated", studio_id: studioId,
    user_role: role, email, exp: expSec },
  key,
);
return new Response(JSON.stringify({ token: jwt }), {
  headers: { "Content-Type": "application/json" },
});
```

- [ ] Deploy: `supabase functions deploy issue-studio-token`.

### Tahap 2 — Integrasi client
- [ ] Di `src/stores/auth.ts` `login()`: setelah session dibuat, panggil Edge Function untuk dapat `token`, simpan (mis. di state + cookie/secure storage bersama session).
- [ ] Set token ke Supabase client. Karena tidak pakai Supabase Auth, attach manual:

```ts
// opsi: bikin client dgn header Authorization, atau set saat runtime
supabase.realtime.setAuth(token);            // utk realtime jika dipakai
// untuk PostgREST: buat ulang client dgn global header, atau gunakan
// supabase.auth.setSession dengan token custom tidak berlaku (bukan GoTrue) →
// gunakan createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
```

> Catatan teknis: PostgREST memakai header `Authorization: Bearer <jwt>`. Pola paling bersih = simpan token di store dan **buat ulang instance supabase** (atau gunakan satu instance dgn fungsi `setAuthToken`) setiap login/refresh. Perlu memastikan SEMUA hook (`useProducts`, dst.) memakai instance yang sama dari `src/lib/supabase.ts`.

- [ ] Di `validateSession()`: saat memulihkan sesi dari cookie, minta token baru ke Edge Function (atau verifikasi exp token tersimpan, refresh bila perlu).
- [ ] Di `logout()`: buang token, kembalikan client ke anon key.
- [ ] **Superadmin**: butuh token dengan hak lintas-studio. Opsi: terbitkan JWT tanpa `studio_id` + `user_role: 'superadmin'`, dan tambahkan klausa bypass di policy (lihat Tahap 3). Alternatif: superadmin tetap pakai service key di flow terpisah (sudah ada `VITE_SUPABASE_SERVICE_KEY`).

### Tahap 3 — Rewrite RLS policy (studio-scoped)
Buat migration baru (mis. `20260608000008_studio_rls_scoped.sql`). Template untuk semua 10 tabel studio:

```sql
-- helper: studio id dari JWT
create or replace function auth_studio_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'studio_id', '')::uuid
  $$;

create or replace function auth_is_superadmin() returns boolean
  language sql stable as $$
    select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '') = 'superadmin'
  $$;

-- contoh untuk products (ulang untuk: members, coaches, packages,
-- package_coaches, member_packages, bookings, product_sales,
-- member_payments, coach_commissions)
drop policy if exists "anon_select_products" on products;
drop policy if exists "anon_insert_products" on products;
drop policy if exists "anon_update_products" on products;
drop policy if exists "anon_delete_products" on products;

create policy "studio_select_products" on products for select
  using (studio_id = auth_studio_id() or auth_is_superadmin());
create policy "studio_insert_products" on products for insert
  with check (studio_id = auth_studio_id() or auth_is_superadmin());
create policy "studio_update_products" on products for update
  using (studio_id = auth_studio_id() or auth_is_superadmin())
  with check (studio_id = auth_studio_id() or auth_is_superadmin());
create policy "studio_delete_products" on products for delete
  using (studio_id = auth_studio_id() or auth_is_superadmin());
```

> Bisa pakai loop `do $$ ... foreach ... $$` seperti di `20260608000007_studio_tables_rls.sql` agar ringkas.

Tabel **bukan** studio-scoped (`licenses`, `license_users`, `sessions`, `users`): biarkan policy-nya seperti sekarang. Catatan: `sessions` & `users` perlu tetap bisa diakses **sebelum** token diterbitkan (saat login) → tetap izinkan anon untuk operasi yang dibutuhkan login, atau pindahkan verifikasi login sepenuhnya ke Edge Function.

### Tahap 4 — Rollout bertahap & verifikasi
- [ ] Terapkan policy scoped **per tabel** (mulai dari yang paling tidak kritikal, mis. `products`), uji CRUD via UI dengan token aktif.
- [ ] Script verifikasi (mirip yang dipakai saat fix `20260608000007`): pastikan dengan JWT studio A **tidak bisa** baca/tulis data studio B (harus 0 rows / error), dan dengan studio yang benar CRUD jalan.
- [ ] Setelah semua tabel terverifikasi, hapus sisa policy permisif.

### Tahap 5 — Pembersihan
- [ ] Pastikan anon key **tidak lagi** punya akses tulis ke tabel studio (kecuali yang memang perlu untuk login).
- [ ] Pertimbangkan rotasi anon key bila sebelumnya tersebar.
- [ ] Update `docs/` & memory bahwa model isolasi sudah server-side.

---

## 6. Risiko & catatan

- **Expiry token vs session:** samakan `exp` JWT dengan masa berlaku session (1 hari / 30 hari "remember me"). Saat token kedaluwarsa tapi session masih valid → refresh otomatis lewat Edge Function di `validateSession()`.
- **Realtime/Storage:** bila memakai Supabase Realtime atau Storage (`BACKUP_BUCKET = 'backups'`), token juga harus dipasang di sana (`supabase.realtime.setAuth`, dan policy storage terpisah).
- **Instance Supabase tunggal:** seluruh app harus memakai satu instance dari `src/lib/supabase.ts`. Hindari membuat instance ad-hoc agar token konsisten.
- **Superadmin:** putuskan satu jalur (JWT superadmin vs service key) dan konsisten.
- **Jangan ekspos JWT secret** di bundle frontend — hanya di secret Edge Function.
- **Tidak destruktif:** rollout bisa dibatalkan dengan mengembalikan policy permisif `20260608000007`.

---

## 7. Definition of Done

- [ ] Login menghasilkan JWT bertanda tangan berisi `studio_id`.
- [ ] Semua hook data memakai client yang mengirim token tersebut.
- [ ] RLS semua tabel studio scoped ke `studio_id` dari JWT (bukan `using(true)`).
- [ ] Terbukti via test: studio A tidak bisa mengakses data studio B.
- [ ] CRUD penuh tetap berfungsi untuk studio yang benar (owner & staff).
- [ ] Superadmin tetap berfungsi.
- [ ] Dokumen & memory diperbarui.

---

## Lampiran — Daftar tabel studio-scoped
`members`, `coaches`, `products`, `packages`, `package_coaches`, `member_packages`, `bookings`, `product_sales`, `member_payments`, `coach_commissions`

## Lampiran — File terkait
- `src/lib/supabase.ts` — instance client + anon key
- `src/stores/auth.ts` — login/logout/validateSession (custom auth)
- `src/utils/studioContext.ts` — `getStudioId()` / `requireStudioId()`
- `src/hooks/use*.ts` — semua akses data per modul
- `supabase/migrations/20260608000007_studio_tables_rls.sql` — policy permisif saat ini (baseline)
