-- ============================================================
-- Coach payouts: rekap & slip gaji komisi coach.
-- Satu baris coach_payouts = satu slip. coach_commissions.payout_id
-- NULL berarti belum dibayar; terisi berarti sudah masuk slip tsb,
-- sehingga satu komisi mustahil terbayar dua kali.
-- ============================================================

create table if not exists coach_payouts (
  payout_id      uuid        primary key default gen_random_uuid(),
  studio_id      uuid        not null references licenses(id) on delete cascade,
  coach_id       uuid        references coaches(coach_id) on delete set null,
  coach_name     text        not null default '',  -- snapshot untuk cetak ulang slip
  period_start   text        not null default '',  -- 'YYYY-MM-DD', selaras coach_commissions.date
  period_end     text        not null default '',
  total_amount   numeric     not null default 0,
  session_count  integer     not null default 0,
  notes          text        not null default '',
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table coach_commissions
  add column if not exists payout_id uuid references coach_payouts(payout_id) on delete set null;

create index if not exists idx_coach_payouts_studio on coach_payouts(studio_id, coach_id);
-- Query "belum dibayar" adalah filter utama sheet payout.
create index if not exists idx_commissions_unpaid
  on coach_commissions(studio_id, coach_id) where payout_id is null;

-- RLS: pola anon penuh, sama seperti tabel studio lain (20260608000007) —
-- aplikasi memakai anon key dan isolasi tenant dilakukan di query aplikasi.
alter table coach_payouts enable row level security;
drop policy if exists "anon_select_coach_payouts" on coach_payouts;
drop policy if exists "anon_insert_coach_payouts" on coach_payouts;
drop policy if exists "anon_update_coach_payouts" on coach_payouts;
drop policy if exists "anon_delete_coach_payouts" on coach_payouts;
create policy "anon_select_coach_payouts" on coach_payouts for select using (true);
create policy "anon_insert_coach_payouts" on coach_payouts for insert with check (true);
create policy "anon_update_coach_payouts" on coach_payouts for update using (true) with check (true);
create policy "anon_delete_coach_payouts" on coach_payouts for delete using (true);

-- Buat slip secara atomik: tandai semua komisi coach yang belum dibayar pada
-- rentang tanggal, lalu simpan totalnya. Race dua pemanggil bersamaan aman:
-- UPDATE kedua menunggu lock baris, re-evaluasi payout_id is null → 0 baris
-- → exception → transaksi kedua rollback tanpa slip kosong.
create or replace function create_coach_payout(
  p_studio_id    uuid,
  p_coach_id     uuid,
  p_period_start text,
  p_period_end   text,
  p_notes        text default ''
) returns jsonb
language plpgsql security definer as $$
declare
  v_payout_id  uuid := gen_random_uuid();
  v_coach_name text;
  v_total      numeric;
  v_count      integer;
begin
  select full_name into v_coach_name
  from coaches where coach_id = p_coach_id and studio_id = p_studio_id;
  if not found then raise exception 'Pelatih tidak ditemukan'; end if;

  insert into coach_payouts (
    payout_id, studio_id, coach_id, coach_name,
    period_start, period_end, notes
  ) values (
    v_payout_id, p_studio_id, p_coach_id, v_coach_name,
    p_period_start, p_period_end, coalesce(p_notes, '')
  );

  update coach_commissions set payout_id = v_payout_id
  where studio_id = p_studio_id
    and coach_id  = p_coach_id
    and payout_id is null
    and date >= p_period_start
    and date <= p_period_end;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Tidak ada komisi yang belum dibayar pada rentang ini';
  end if;

  select coalesce(sum(commission_amount), 0) into v_total
  from coach_commissions where payout_id = v_payout_id;

  update coach_payouts
  set total_amount = v_total, session_count = v_count
  where payout_id = v_payout_id;

  return jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'total_amount', v_total,
    'session_count', v_count
  );
end;
$$;
