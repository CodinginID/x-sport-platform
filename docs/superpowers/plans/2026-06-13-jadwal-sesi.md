# Jadwal Sesi Latihan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti alur booking jam-bebas dengan **sesi latihan terjadwal** — tiap hari ada beberapa sesi (jam + coach + kapasitas slot), admin mendaftarkan member yang punya paket aktif, dan sisa sesi berkurang saat hadir.

**Architecture:** Tabel baru `training_sessions` (jam/coach/paket/kapasitas). Tabel `bookings` di-repurpose jadi "peserta sesi" lewat kolom baru `training_session_id`. Pendaftaran lewat RPC atomik (`register_session_participant`) yang mengunci baris sesi untuk mencegah rebutan slot. Kehadiran & komisi pakai ulang RPC `attend_booking` yang sudah ada (registrasi mengisi `coach_id`/`package_id`/`package_price`/`booking_date` dari sesi, jadi RPC lama jalan tanpa diubah). UI halaman Booking dirombak jadi "Jadwal Sesi" (per hari).

**Tech Stack:** React + TypeScript, Zustand, TanStack Query, Supabase (Postgres + RPC plpgsql, RLS anon), Vite, Vitest. Komentar kode berbahasa Indonesia (ikut konvensi repo).

**Spec:** `docs/superpowers/specs/2026-06-12-jadwal-sesi-design.md`

---

## File Structure

| File | Aksi | Tanggung jawab |
|---|---|---|
| `supabase/migrations/20260613000001_training_sessions.sql` | Create | Schema: enum status, `packages.default_capacity`, tabel `training_sessions`, `bookings.training_session_id`, index, RLS |
| `supabase/migrations/20260613000002_register_session_participant.sql` | Create | RPC atomik pendaftaran peserta (lock baris sesi, validasi paket+slot, insert booking) |
| `src/types/index.ts` | Modify | Tambah `TrainingSession`, `Package.default_capacity`, `Booking.training_session_id` |
| `src/hooks/useTrainingSessions.ts` | Create | Query & mutation sesi + peserta + RPC daftar |
| `src/hooks/index.ts` | Modify | Re-export hook baru |
| `src/modules/bookings/BookingsPage.tsx` | Modify (rombak) | Layar Jadwal Sesi: daftar sesi per hari + filter paket |
| `src/modules/bookings/CreateSessionModal.tsx` | Create | Modal buat sesi |
| `src/modules/bookings/SessionDetailSheet.tsx` | Create | Detail sesi + daftar peserta + daftarkan member + hadir/batal |
| `src/modules/packages/PackagesPage.tsx` | Modify | Tambah input `default_capacity` di form paket |
| `src/test/training-sessions.test.ts` | Create | Unit test util kapasitas & status |

> Catatan migrasi DB: file SQL ditulis mengikuti konvensi repo. Penerapan ke Supabase via `supabase db push` (CLI ter-link) **atau** paste ke SQL Editor dashboard — lihat Task 1 Step terakhir. Frontend tidak bisa diuji end-to-end sampai migration diterapkan.

---

## Task 1: Migration schema `training_sessions`

**Files:**
- Create: `supabase/migrations/20260613000001_training_sessions.sql`

- [ ] **Step 1: Tulis migration SQL**

```sql
-- ============================================================
-- Jadwal Sesi Latihan — schema
-- Catatan: nama `sessions` sudah dipakai untuk AUTH session (cookie login),
-- maka tabel sesi latihan = `training_sessions`.
-- ============================================================

-- Status sesi latihan
do $$ begin
  create type training_session_status as enum ('scheduled', 'cancelled');
exception when duplicate_object then null; end $$;

-- Kapasitas default per paket (dipakai saat membuat sesi)
alter table packages
  add column if not exists default_capacity integer not null default 1;

-- Tabel sesi latihan
create table if not exists training_sessions (
  training_session_id uuid                     primary key,
  studio_id           uuid                     not null references licenses(id) on delete cascade,
  package_id          uuid                     not null references packages(package_id),
  coach_id            uuid                     not null references coaches(coach_id),
  session_date        text                     not null default '',
  session_time        text                     not null default '',
  capacity            integer                  not null default 1,
  status              training_session_status  not null default 'scheduled',
  created_at          timestamptz              not null default now(),
  updated_at          timestamptz              not null default now()
);

create index if not exists idx_tsession_studio on training_sessions(studio_id);
create index if not exists idx_tsession_date   on training_sessions(studio_id, session_date);
create index if not exists idx_tsession_pkg    on training_sessions(studio_id, package_id);

-- Peserta sesi = booking dengan referensi ke sesi (kolom legacy lain dibiarkan untuk arsip)
alter table bookings
  add column if not exists training_session_id uuid references training_sessions(training_session_id);

create index if not exists idx_bookings_tsession on bookings(studio_id, training_session_id);

-- RLS: anon client (app) boleh kelola training_sessions (pola sama seperti tabel studio lain)
alter table if exists training_sessions enable row level security;
drop policy if exists "anon_insert_tsession" on training_sessions;
drop policy if exists "anon_select_tsession" on training_sessions;
drop policy if exists "anon_update_tsession" on training_sessions;
drop policy if exists "anon_delete_tsession" on training_sessions;
create policy "anon_insert_tsession" on training_sessions for insert with check (true);
create policy "anon_select_tsession" on training_sessions for select using (true);
create policy "anon_update_tsession" on training_sessions for update using (true) with check (true);
create policy "anon_delete_tsession" on training_sessions for delete using (true);
```

- [ ] **Step 2: Validasi SQL secara statis**

Run: `grep -c "create policy" supabase/migrations/20260613000001_training_sessions.sql`
Expected: `4`

- [ ] **Step 3: Terapkan migration ke DB**

Pakai salah satu (sesuai setup tim):
- CLI: `supabase db push`
- Atau buka Supabase Dashboard → SQL Editor → paste isi file → Run.

Expected: tabel `training_sessions` ada, kolom `packages.default_capacity` & `bookings.training_session_id` ada.
Verifikasi (SQL Editor): `select count(*) from training_sessions;` → `0` tanpa error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260613000001_training_sessions.sql
git commit -m "feat(db): tambah schema training_sessions + packages.default_capacity"
```

---

## Task 2: RPC `register_session_participant` (pendaftaran atomik)

**Files:**
- Create: `supabase/migrations/20260613000002_register_session_participant.sql`

Kontrak: `register_session_participant(p_training_session_id uuid, p_member_id uuid, p_studio_id uuid) returns jsonb`.
Mengembalikan `{ ok: true, booking_id }` atau `raise exception` dengan pesan Indonesia.

- [ ] **Step 1: Tulis RPC SQL**

```sql
-- ============================================================
-- Pendaftaran peserta ke sesi latihan — ATOMIK.
-- Mengunci baris sesi (FOR UPDATE) agar dua admin tidak merebut
-- slot terakhir bersamaan. Mengisi field booking dari sesi & paket
-- sehingga attend_booking (RPC existing) jalan tanpa diubah.
-- ============================================================
create or replace function register_session_participant(
  p_training_session_id uuid,
  p_member_id           uuid,
  p_studio_id           uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_session   training_sessions%rowtype;
  v_pkg       packages%rowtype;
  v_mp        member_packages%rowtype;
  v_count     integer;
  v_booking_id uuid := gen_random_uuid();
begin
  -- Kunci baris sesi → serialize pendaftaran per sesi
  select * into v_session
  from training_sessions
  where training_session_id = p_training_session_id and studio_id = p_studio_id
  for update;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'Sesi sudah dibatalkan';
  end if;

  -- Cegah duplikat: member sudah punya slot aktif di sesi ini?
  select count(*) into v_count
  from bookings
  where training_session_id = p_training_session_id
    and member_id = p_member_id
    and booking_status <> 'cancelled';
  if v_count > 0 then
    raise exception 'Member sudah terdaftar di sesi ini';
  end if;

  -- Slot tersedia? (hitung peserta non-cancelled)
  select count(*) into v_count
  from bookings
  where training_session_id = p_training_session_id
    and booking_status <> 'cancelled';
  if v_count >= v_session.capacity then
    raise exception 'Slot sesi sudah penuh';
  end if;

  -- Paket member aktif untuk paket sesi ini (FIFO: paling lama dulu)
  select * into v_mp
  from member_packages
  where studio_id = p_studio_id
    and member_id = p_member_id
    and package_id = v_session.package_id
    and status = 'active'
    and remaining_sessions > 0
  order by created_at asc
  limit 1;
  if not found then
    raise exception 'Member tidak punya paket aktif yang sesuai (atau sisa sesi habis)';
  end if;

  select * into v_pkg from packages where package_id = v_session.package_id;

  -- Insert peserta (isi field legacy dari sesi/paket agar attend_booking jalan)
  insert into bookings (
    booking_id, studio_id, training_session_id,
    booking_date, booking_time, member_id, coach_id, package_id,
    member_package_id, package_price, booking_status, created_at, updated_at
  ) values (
    v_booking_id, p_studio_id, p_training_session_id,
    v_session.session_date, v_session.session_time, p_member_id, v_session.coach_id, v_session.package_id,
    v_mp.member_package_id, coalesce(v_pkg.package_price, 0), 'booked', now(), now()
  );

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;
```

- [ ] **Step 2: Terapkan ke DB** (CLI `supabase db push` atau SQL Editor). Verifikasi fungsi ada:

Run (SQL Editor): `select proname from pg_proc where proname = 'register_session_participant';`
Expected: 1 baris.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260613000002_register_session_participant.sql
git commit -m "feat(db): RPC register_session_participant (pendaftaran atomik + cek slot/paket)"
```

---

## Task 3: Types

**Files:**
- Modify: `src/types/index.ts` (Package `:67-78`, Booking `:100-112`)

- [ ] **Step 1: Tambah `default_capacity` ke `Package`**

Di interface `Package`, setelah `package_price`:
```ts
  package_price: number;
  default_capacity: number;
```

- [ ] **Step 2: Tambah `training_session_id` ke `Booking`**

Di interface `Booking`, setelah `member_package_id`:
```ts
  member_package_id: string | null;
  training_session_id: string | null;
```

- [ ] **Step 3: Tambah interface `TrainingSession`** (setelah interface `Booking`)

```ts
export interface TrainingSession {
  training_session_id: string;
  package_id: string;
  coach_id: string;
  session_date: string;
  session_time: string;
  capacity: number;
  status: 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error baru terkait tipe ini (error lain di luar scope diabaikan bila sudah ada sebelumnya).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): TrainingSession + Package.default_capacity + Booking.training_session_id"
```

---

## Task 4: Hook util kapasitas + test (TDD)

**Files:**
- Create: `src/hooks/useTrainingSessions.ts` (mulai dengan util murni)
- Test: `src/test/training-sessions.test.ts`

- [ ] **Step 1: Tulis test gagal untuk util status slot**

```ts
import { describe, it, expect } from 'vitest';
import { slotInfo } from '@/hooks/useTrainingSessions';

describe('slotInfo', () => {
  it('hitung terisi & penuh dari peserta non-cancelled', () => {
    expect(slotInfo(3, 8)).toEqual({ filled: 3, capacity: 8, isFull: false });
    expect(slotInfo(8, 8)).toEqual({ filled: 8, capacity: 8, isFull: true });
    expect(slotInfo(9, 8)).toEqual({ filled: 9, capacity: 8, isFull: true });
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npx vitest run src/test/training-sessions.test.ts`
Expected: FAIL (`slotInfo` belum ada).

- [ ] **Step 3: Implement util di `useTrainingSessions.ts`**

```ts
export interface SlotInfo { filled: number; capacity: number; isFull: boolean; }

/** Hitung status slot sesi. "Penuh" diturunkan, tidak disimpan. */
export function slotInfo(filled: number, capacity: number): SlotInfo {
  return { filled, capacity, isFull: filled >= capacity };
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npx vitest run src/test/training-sessions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTrainingSessions.ts src/test/training-sessions.test.ts
git commit -m "feat(hooks): util slotInfo + test"
```

---

## Task 5: Hooks query & mutation sesi + peserta

**Files:**
- Modify: `src/hooks/useTrainingSessions.ts`
- Modify: `src/hooks/index.ts`

Pola ikut `src/hooks/useBookings.ts` (query pakai `getStudioId()`, mutation pakai `requireStudioId()` + toast via `useToastStore.getState()` + invalidate).

- [ ] **Step 1: Tambah imports & query sesi per tanggal**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';
import type { TrainingSession, Booking } from '@/types';

/** Sesi pada satu tanggal (default: semua bila date kosong). */
export function useTrainingSessions(date?: string) {
  return useQuery({
    queryKey: ['trainingSessions', date],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('training_sessions').select('*')
        .eq('studio_id', studioId).eq('status', 'scheduled')
        .order('session_time', { ascending: true });
      if (date) q = q.eq('session_date', date);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as TrainingSession[];
    },
  });
}
```

- [ ] **Step 2: Query peserta sebuah sesi**

```ts
/** Peserta (bookings) di sebuah sesi. */
export function useSessionParticipants(trainingSessionId?: string) {
  return useQuery({
    queryKey: ['sessionParticipants', trainingSessionId],
    enabled: !!trainingSessionId,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId || !trainingSessionId) return [];
      const { data, error } = await supabase.from('bookings').select('*')
        .eq('studio_id', studioId)
        .eq('training_session_id', trainingSessionId)
        .neq('booking_status', 'cancelled')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Booking[];
    },
  });
}
```

- [ ] **Step 3: Mutation buat/batal sesi**

```ts
/** Buat atau batalkan sesi. */
export function useTrainingSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data:
      | { action: 'create'; session: Pick<TrainingSession, 'package_id' | 'coach_id' | 'session_date' | 'session_time' | 'capacity'> }
      | { action: 'cancel'; training_session_id: string }
    ) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();
      if (data.action === 'create') {
        const row = {
          training_session_id: generateId(), studio_id: studioId,
          ...data.session, status: 'scheduled' as const, created_at: now, updated_at: now,
        };
        const { error } = await supabase.from('training_sessions').insert(row);
        if (error) throw new Error(error.message);
        return row;
      }
      // cancel: batalkan sesi + semua peserta booked
      const { error: e1 } = await supabase.from('training_sessions')
        .update({ status: 'cancelled', updated_at: now })
        .eq('training_session_id', data.training_session_id).eq('studio_id', studioId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase.from('bookings')
        .update({ booking_status: 'cancelled', updated_at: now })
        .eq('training_session_id', data.training_session_id).eq('studio_id', studioId)
        .eq('booking_status', 'booked');
      if (e2) throw new Error(e2.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['trainingSessions'] });
      qc.invalidateQueries({ queryKey: ['sessionParticipants'] });
      useToastStore.getState().addToast(vars.action === 'create' ? 'Sesi dibuat' : 'Sesi dibatalkan',
        vars.action === 'cancel' ? 'warning' : 'success');
    },
    onError: (e: Error) => useToastStore.getState().addToast(e.message || 'Gagal memproses sesi', 'error'),
  });
}
```

- [ ] **Step 4: Mutation daftarkan peserta (RPC)**

```ts
/** Daftarkan member ke sesi via RPC atomik. */
export function useRegisterParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { training_session_id: string; member_id: string }) => {
      const studioId = requireStudioId();
      const { error } = await supabase.rpc('register_session_participant', {
        p_training_session_id: vars.training_session_id,
        p_member_id: vars.member_id,
        p_studio_id: studioId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionParticipants'] });
      qc.invalidateQueries({ queryKey: ['trainingSessions'] });
      useToastStore.getState().addToast('Member terdaftar di sesi', 'success');
    },
    onError: (e: Error) => useToastStore.getState().addToast(e.message || 'Gagal mendaftarkan member', 'error'),
  });
}
```

- [ ] **Step 5: Re-export di `src/hooks/index.ts`**

```ts
export { useTrainingSessions, useSessionParticipants, useTrainingSessionMutation, useRegisterParticipant, slotInfo } from './useTrainingSessions';
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` → tidak ada error baru.
```bash
git add src/hooks/useTrainingSessions.ts src/hooks/index.ts
git commit -m "feat(hooks): training session query/mutation + register RPC"
```

---

## Task 6: Form paket — input `default_capacity`

**Files:**
- Modify: `src/modules/packages/PackagesPage.tsx`

- [ ] **Step 1: Baca form paket existing**

Run: `grep -n "package_price\|session_count\|defaultForm\|useState" src/modules/packages/PackagesPage.tsx | head`
Tujuan: temukan state form & field harga untuk menyisipkan input kapasitas dengan pola sama.

- [ ] **Step 2: Tambah field `default_capacity` ke state form & input**

Tambahkan ke default form: `default_capacity: 1`.
Tambah satu input number (ikut style input lain di form), label "Kapasitas default per sesi", `min={1}`, simpan ke `default_capacity` (number). Pastikan ikut terkirim saat create/update paket.

- [ ] **Step 3: Build cek + commit**

Run: `npm run build` → sukses.
```bash
git add src/modules/packages/PackagesPage.tsx
git commit -m "feat(packages): input kapasitas default per sesi"
```

---

## Task 7: UI — CreateSessionModal

**Files:**
- Create: `src/modules/bookings/CreateSessionModal.tsx`

Props: `{ open: boolean; onClose: () => void }`. Pakai `Modal`, `Button` dari `@/components/ui`. Coach difilter dari `usePackageCoaches()` untuk paket terpilih (pola sama `BookingsPage` `packageCoachOptions`). Kapasitas auto-isi dari `packages.default_capacity` saat paket dipilih, bisa diubah. Submit → `useTrainingSessionMutation().mutate({action:'create', session})`.

- [ ] **Step 1: Tulis komponen**

```tsx
import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { usePackages, usePackageCoaches, useCoaches, useTrainingSessionMutation } from '@/hooks';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function CreateSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: packages = [] } = usePackages();
  const { data: coaches = [] } = useCoaches();
  const { data: allPackageCoaches = [] } = usePackageCoaches();
  const mutation = useTrainingSessionMutation();

  const [form, setForm] = useState({ package_id: '', coach_id: '', session_date: todayLocal(), session_time: '', capacity: 1 });

  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const coachOptions = allPackageCoaches
    .filter(pc => pc.package_id === form.package_id)
    .map(pc => ({ value: pc.coach_id, label: coachMap[pc.coach_id] ?? pc.coach_id }));

  const onPackageChange = (package_id: string) => {
    const pkg = packages.find(p => p.package_id === package_id);
    setForm({ ...form, package_id, capacity: pkg?.default_capacity ?? 1, coach_id: '' });
  };

  const valid = form.package_id && form.coach_id && form.session_date && form.session_time && form.capacity > 0;
  const submit = () => {
    if (!valid) return;
    mutation.mutate({ action: 'create', session: form }, { onSuccess: () => { setForm({ package_id: '', coach_id: '', session_date: todayLocal(), session_time: '', capacity: 1 }); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Sesi">
      <div className="space-y-5">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Paket</label>
          <select value={form.package_id} onChange={e => onPackageChange(e.target.value)}
            className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium text-zen-ink outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
            <option value="">Pilih paket...</option>
            {packages.map(p => <option key={p.package_id} value={p.package_id}>{p.package_name}</option>)}
          </select>
        </div>

        {form.package_id && (
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2 block">Coach</label>
            {coachOptions.length === 0
              ? <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">Paket ini belum punya coach. Tambahkan di menu Paket.</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {coachOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm({ ...form, coach_id: opt.value })}
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold border transition-all ${form.coach_id === opt.value ? 'bg-zen-brand text-white border-zen-brand' : 'bg-zen-bg text-zen-ink/60 border-zen-ink/10 hover:border-zen-brand/40'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Tanggal</label>
            <input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Jam</label>
            <input type="time" value={form.session_time} onChange={e => setForm({ ...form, session_time: e.target.value })}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Kapasitas (slot peserta)</label>
          <input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Math.max(1, Number(e.target.value)) })}
            className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending} className="flex-1">
            {mutation.isPending ? 'Menyimpan...' : 'Buat Sesi'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Build cek + commit**

Run: `npm run build` → sukses.
```bash
git add src/modules/bookings/CreateSessionModal.tsx
git commit -m "feat(sessions): modal buat sesi"
```

---

## Task 8: UI — SessionDetailSheet (peserta + daftar + hadir/batal)

**Files:**
- Create: `src/modules/bookings/SessionDetailSheet.tsx`

Props: `{ session: TrainingSession | null; onClose: () => void }`. Pakai `DetailSheet`/`DetailSection` (pola `BookingsPage`). Daftar peserta via `useSessionParticipants`. Daftarkan member via `useRegisterParticipant` (dropdown member). Hadir/Batal pakai ulang `useBookingMutation` (`action: 'attend' | 'cancel'`). Tombol "+ Daftarkan" disabled bila slot penuh (`slotInfo`).

- [ ] **Step 1: Tulis komponen**

```tsx
import { useState } from 'react';
import { DetailSheet, DetailSection } from '@/components/DetailSheet';
import { CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import { useMembers, useCoaches, usePackages, useSessionParticipants, useRegisterParticipant, useBookingMutation, slotInfo } from '@/hooks';
import type { TrainingSession } from '@/types';

export function SessionDetailSheet({ session, onClose }: { session: TrainingSession | null; onClose: () => void }) {
  const { data: members = [] } = useMembers();
  const { data: coaches = [] } = useCoaches();
  const { data: packages = [] } = usePackages();
  const { data: participants = [] } = useSessionParticipants(session?.training_session_id);
  const register = useRegisterParticipant();
  const bookingMutation = useBookingMutation();
  const [memberId, setMemberId] = useState('');

  if (!session) return null;
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachName = coaches.find(c => c.coach_id === session.coach_id)?.full_name ?? '—';
  const pkgName = packages.find(p => p.package_id === session.package_id)?.package_name ?? '—';
  const slot = slotInfo(participants.length, session.capacity);

  const doRegister = () => {
    if (!memberId) return;
    register.mutate({ training_session_id: session.training_session_id, member_id: memberId },
      { onSuccess: () => setMemberId('') });
  };

  return (
    <DetailSheet open={!!session} onClose={onClose}
      title={`${session.session_time} · ${pkgName}`}
      subtitle={`Coach ${coachName} · slot ${slot.filled}/${slot.capacity}`}>

      <DetailSection title={`Peserta (${slot.filled}/${slot.capacity})`}>
        {participants.length === 0
          ? <p className="text-xs text-zen-ink/40 py-2">Belum ada peserta.</p>
          : (
            <div className="divide-y divide-zen-ink/5">
              {participants.map(p => (
                <div key={p.booking_id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{memberMap[p.member_id] ?? '?'}</p>
                    <p className="text-[11px] text-zen-ink/40">{p.booking_status === 'attended' ? 'Hadir' : 'Terdaftar'}</p>
                  </div>
                  {p.booking_status === 'booked' && (
                    <>
                      <button onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: p.booking_id } })}
                        className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center" title="Hadir">
                        <CheckCircle2 size={15} />
                      </button>
                      <button onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: p.booking_id } })}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center" title="Batalkan">
                        <XCircle size={15} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
      </DetailSection>

      {!slot.isFull && (
        <div className="flex gap-2 pt-1">
          <select value={memberId} onChange={e => setMemberId(e.target.value)}
            className="flex-1 px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
            <option value="">Pilih member...</option>
            {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
          </select>
          <button onClick={doRegister} disabled={!memberId || register.isPending}
            className="px-4 rounded-2xl bg-zen-brand text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <UserPlus size={15} /> Daftar
          </button>
        </div>
      )}
      {slot.isFull && <p className="text-xs text-red-500 font-bold text-center pt-1">Slot penuh</p>}
    </DetailSheet>
  );
}
```

> Catatan: sistem menolak otomatis bila member tak punya paket aktif untuk paket sesi (pesan dari RPC tampil sebagai toast error). Tidak perlu pre-filter member di dropdown untuk MVP.

- [ ] **Step 2: Build cek + commit**

Run: `npm run build` → sukses.
```bash
git add src/modules/bookings/SessionDetailSheet.tsx
git commit -m "feat(sessions): detail sesi + peserta + daftar/hadir/batal"
```

---

## Task 9: Rombak BookingsPage → Jadwal Sesi

**Files:**
- Modify: `src/modules/bookings/BookingsPage.tsx`

Ganti isi: daftar sesi per tanggal (default hari ini) + filter paket + tombol "+ Buat Sesi". Klik kartu sesi → buka `SessionDetailSheet`. Hapus alur booking jam-bebas & walk-in lama (diarsip di DB; kode lama dibuang). Pertahankan import `useTranslation` bila dipakai header.

- [ ] **Step 1: Tulis ulang komponen**

```tsx
import { useState } from 'react';
import { Calendar, Plus, CalendarX } from 'lucide-react';
import { SearchBar } from '@/components/ui';
import { ListSkeleton } from '@/components/Skeleton';
import { useTrainingSessions, useSessionCounts, usePackages, useCoaches } from '@/hooks';
import { CreateSessionModal } from './CreateSessionModal';
import { SessionDetailSheet } from './SessionDetailSheet';
import type { TrainingSession } from '@/types';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function BookingsPage() {
  const [date, setDate] = useState(todayLocal());
  const [packageFilter, setPackageFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TrainingSession | null>(null);

  const { data: sessions = [], isLoading } = useTrainingSessions(date);
  const { data: packages = [] } = usePackages();
  const { data: coaches = [] } = useCoaches();
  const counts = useSessionCounts(sessions.map(s => s.training_session_id));

  const pkgMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const shown = packageFilter ? sessions.filter(s => s.package_id === packageFilter) : sessions;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jadwal Sesi</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zen-brand text-white text-sm font-bold">
          <Plus size={15} /> Buat Sesi
        </button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand" />
        </div>
        <select value={packageFilter} onChange={e => setPackageFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl">
          <option value="">Semua paket</option>
          {packages.map(p => <option key={p.package_id} value={p.package_id}>{p.package_name}</option>)}
        </select>
      </div>

      {isLoading ? <ListSkeleton rows={5} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <CalendarX size={32} className="mb-3" />
              <p className="text-sm">Belum ada sesi pada tanggal ini</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {shown.map(s => {
                const filled = counts[s.training_session_id] ?? 0;
                const full = filled >= s.capacity;
                return (
                  <div key={s.training_session_id} onClick={() => setDetail(s)}
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zen-bg transition-colors">
                    <div className="w-14 shrink-0 text-sm font-bold text-zen-ink">{s.session_time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{pkgMap[s.package_id] ?? '—'}</p>
                      <p className="text-xs text-zen-ink/40 truncate">Coach {coachMap[s.coach_id] ?? '—'}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${full ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {full ? 'PENUH' : `${filled}/${s.capacity}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CreateSessionModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailSheet session={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Tambah hook `useSessionCounts`** di `src/hooks/useTrainingSessions.ts` (jumlah peserta non-cancelled per sesi, untuk badge slot di daftar)

```ts
/** Jumlah peserta non-cancelled per sesi (untuk badge slot). */
export function useSessionCounts(sessionIds: string[]) {
  const key = [...sessionIds].sort().join(',');
  const { data } = useQuery({
    queryKey: ['sessionCounts', key],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId || sessionIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase.from('bookings')
        .select('training_session_id')
        .eq('studio_id', studioId)
        .neq('booking_status', 'cancelled')
        .in('training_session_id', sessionIds);
      if (error) throw new Error(error.message);
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { training_session_id: string }[]) {
        map[row.training_session_id] = (map[row.training_session_id] ?? 0) + 1;
      }
      return map;
    },
  });
  return data ?? {};
}
```
Re-export `useSessionCounts` di `src/hooks/index.ts` dan di baris export Task 5 Step 5.

- [ ] **Step 3: Build cek + commit**

Run: `npm run build` → sukses.
```bash
git add src/modules/bookings/BookingsPage.tsx src/hooks/useTrainingSessions.ts src/hooks/index.ts
git commit -m "feat(sessions): rombak halaman Booking jadi Jadwal Sesi"
```

---

## Task 10: Verifikasi penuh & test akhir

- [ ] **Step 1: Build & unit test**

Run: `npm run build && npx vitest run`
Expected: build sukses, semua test (termasuk `training-sessions.test.ts`) PASS.

- [ ] **Step 2: Smoke test manual (perlu migration sudah diterapkan)**

1. Tambah `default_capacity` di salah satu paket (mis. 2).
2. Buat sesi untuk paket itu (jam, coach).
3. Daftarkan member yang punya paket aktif → muncul sebagai peserta `Terdaftar`.
4. Daftarkan member tanpa paket aktif → toast error "tidak punya paket aktif".
5. Daftarkan sampai melebihi kapasitas → toast error "Slot sesi sudah penuh", badge "PENUH".
6. Tekan **Hadir** pada peserta → `remaining_sessions` member berkurang 1 (cek di DB / menu member).
7. Batalkan sesi → semua peserta booked jadi cancelled, slot kosong.

- [ ] **Step 3: Commit akhir (bila ada perubahan kecil dari verifikasi)**

```bash
git add -A && git commit -m "test(sessions): verifikasi alur jadwal sesi"
```

---

## Catatan Eksekusi

- **Migration DB** (Task 1 & 2) harus **diterapkan ke Supabase** sebelum frontend bisa diuji end-to-end. Bila CLI `supabase` tidak ter-link, jalankan SQL via Dashboard SQL Editor.
- **Branch:** kerjakan di branch fitur terpisah dari `release/prod` (mis. `feature/jadwal-sesi`) agar perubahan printer yang masih pending tidak tercampur.
- **Reuse:** `attend_booking` (RPC) & `useBookingMutation` (`attend`/`cancel`) dipakai ulang — jangan bikin RPC kehadiran baru.
