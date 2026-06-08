import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { MemberPackage, MemberPayment, ProductSale, ProductSaleItem, CoachCommission } from '@/types';
import { addDays } from 'date-fns';
import { useToastStore } from '@/stores/toast';
import { productSaleSchema, memberPaymentSchema } from '@/utils/schemas';

export function useMemberPackages(member_id?: string) {
  return useQuery({
    queryKey: ['memberPackages', member_id],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('member_packages').select('*').eq('studio_id', studioId).order('created_at', { ascending: false });
      if (member_id) q = q.eq('member_id', member_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as MemberPackage[];
    },
  });
}

export function useMemberPayments(filters?: { member_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['memberPayments', filters],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('member_payments').select('*').eq('studio_id', studioId).order('payment_date', { ascending: false });
      if (filters?.member_id)  q = q.eq('member_id', filters.member_id);
      if (filters?.startDate)  q = q.gte('payment_date', filters.startDate);
      if (filters?.endDate)    q = q.lte('payment_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as MemberPayment[];
    },
  });
}

export function useMemberPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<MemberPayment, 'payment_id' | 'created_at'>) => {
      const studioId = requireStudioId();

      const parsed = memberPaymentSchema.safeParse(payment);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? 'Data pembayaran tidak valid');
      }

      // Fetch package to calculate expired_date
      const { data: pkg, error: pkgErr } = await supabase
        .from('packages').select('session_count, valid_days')
        .eq('package_id', payment.package_id)
        .eq('studio_id', studioId)
        .single();
      if (pkgErr || !pkg) throw new Error('Paket tidak ditemukan');

      const expiredDate = addDays(new Date(payment.payment_date), pkg.valid_days).toISOString().split('T')[0];

      const paymentData = {
        payment_date: payment.payment_date,
        member_id: payment.member_id,
        package_id: payment.package_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        notes: payment.notes,
      };

      const memberPackageData = {
        member_id: payment.member_id,
        package_id: payment.package_id,
        purchase_date: payment.payment_date,
        expired_date: expiredDate,
        total_sessions: pkg.session_count ?? 0,
        remaining_sessions: pkg.session_count ?? 0,
      };

      // Atomic via RPC
      const { error } = await supabase.rpc('create_member_payment', {
        p_studio_id: studioId,
        p_payment: paymentData,
        p_member_package: memberPackageData,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberPayments'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      useToastStore.getState().addToast('Pembayaran berhasil disimpan', 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan pembayaran', 'error'); },
  });
}

export function useProductSales(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['productSales', filters],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('product_sales').select('*').eq('studio_id', studioId).order('transaction_date', { ascending: false });
      if (filters?.startDate) q = q.gte('transaction_date', filters.startDate);
      if (filters?.endDate)   q = q.lte('transaction_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as ProductSale[];
    },
  });
}

function mergeSaleItems(items: ProductSaleItem[]): ProductSaleItem[] {
  const map = new Map<string, ProductSaleItem>();
  for (const item of items) {
    const existing = map.get(item.product_id);
    if (existing) {
      const quantity = existing.quantity + item.quantity;
      map.set(item.product_id, { ...existing, quantity, subtotal: existing.unit_price * quantity });
    } else {
      map.set(item.product_id, { ...item });
    }
  }
  return Array.from(map.values());
}

export function useProductSaleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ProductSale, 'transaction_id' | 'created_at'>) => {
      const studioId = requireStudioId();

      const mergedItems = mergeSaleItems(input.items);
      const subtotal = mergedItems.reduce((sum, i) => sum + i.subtotal, 0);
      const discount = Math.max(0, input.discount ?? 0);
      const total = Math.max(0, subtotal - discount);
      const cashReceived = input.payment_method === 'cash' ? (input.cash_received ?? 0) : total;
      const change = input.payment_method === 'cash' ? Math.max(0, cashReceived - total) : 0;

      const sale = { ...input, items: mergedItems, subtotal, discount, total, cash_received: cashReceived, change };

      const parsed = productSaleSchema.safeParse(sale);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? 'Data penjualan tidak valid');
      }

      // Atomic via RPC (validates stock + inserts + decrements)
      const { error } = await supabase.rpc('create_product_sale', {
        p_studio_id: studioId,
        p_sale: sale,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productSales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      useToastStore.getState().addToast('Penjualan berhasil disimpan', 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan penjualan', 'error'); },
  });
}

export function useCoachCommissions(filters?: { coach_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['coachCommissions', filters],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('coach_commissions').select('*').eq('studio_id', studioId).order('date', { ascending: false });
      if (filters?.coach_id)  q = q.eq('coach_id', filters.coach_id);
      if (filters?.startDate) q = q.gte('date', filters.startDate);
      if (filters?.endDate)   q = q.lte('date', filters.endDate);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as CoachCommission[];
    },
  });
}
