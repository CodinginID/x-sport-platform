-- ============================================================
-- Reset semua data studio dalam SATU transaksi, urutan FK yang benar.
-- Mengganti penghapusan paralel via client (rawan gagal FK + RLS).
-- security definer → bypass RLS. TIDAK menghapus: users (staf), licenses,
-- sessions (auth), platform_config (global).
-- ============================================================
create or replace function reset_studio_data(p_studio_id uuid)
returns jsonb
language plpgsql security definer as $$
begin
  -- anak dulu → induk
  delete from coach_commissions  where studio_id = p_studio_id;
  delete from member_payments    where studio_id = p_studio_id;
  delete from bookings           where studio_id = p_studio_id;  -- refs training_sessions, members, coaches, packages, member_packages
  delete from training_sessions  where studio_id = p_studio_id;  -- refs coaches
  delete from member_packages    where studio_id = p_studio_id;  -- refs members, packages
  delete from product_sales      where studio_id = p_studio_id;
  -- induk
  delete from members            where studio_id = p_studio_id;
  delete from coaches            where studio_id = p_studio_id;
  delete from packages           where studio_id = p_studio_id;
  delete from products           where studio_id = p_studio_id;
  return jsonb_build_object('ok', true);
end;
$$;
