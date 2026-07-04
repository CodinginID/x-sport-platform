-- ============================================================
-- Potongan (deduction) pada slip gaji coach, mengikuti format
-- slip client: Total Pendapatan - Potongan = Total Akhir.
-- Signature RPC berubah (tambah p_deduction) → drop versi lama
-- agar tidak jadi overload ganda.
-- ============================================================

alter table coach_payouts
  add column if not exists deduction numeric not null default 0;

drop function if exists create_coach_payout(uuid, uuid, text, text, text);

create or replace function create_coach_payout(
  p_studio_id    uuid,
  p_coach_id     uuid,
  p_period_start text,
  p_period_end   text,
  p_notes        text default '',
  p_deduction    numeric default 0
) returns jsonb
language plpgsql security definer as $$
declare
  v_payout_id  uuid := gen_random_uuid();
  v_coach_name text;
  v_total      numeric;
  v_count      integer;
begin
  if coalesce(p_deduction, 0) < 0 then
    raise exception 'Potongan tidak boleh negatif';
  end if;

  select full_name into v_coach_name
  from coaches where coach_id = p_coach_id and studio_id = p_studio_id;
  if not found then raise exception 'Pelatih tidak ditemukan'; end if;

  insert into coach_payouts (
    payout_id, studio_id, coach_id, coach_name,
    period_start, period_end, notes, deduction
  ) values (
    v_payout_id, p_studio_id, p_coach_id, v_coach_name,
    p_period_start, p_period_end, coalesce(p_notes, ''), coalesce(p_deduction, 0)
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

  if coalesce(p_deduction, 0) > v_total then
    raise exception 'Potongan melebihi total komisi';
  end if;

  update coach_payouts
  set total_amount = v_total, session_count = v_count
  where payout_id = v_payout_id;

  return jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'total_amount', v_total,
    'session_count', v_count,
    'deduction', coalesce(p_deduction, 0)
  );
end;
$$;
