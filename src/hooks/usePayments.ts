import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Booking, MemberPackage, MemberPayment, ProductSale, ProductSaleItem, CoachCommission } from '@/types';
import { addDays } from 'date-fns';
import { productSaleSchema, memberPaymentSchema } from '@/utils/schemas';

/** Booking milik member yang belum dibayar (member_package_id masih null, status masih booked) */
export function useUnpaidBookings(member_id: string) {
  return useQuery({
    queryKey: ['unpaidBookings', member_id],
    enabled: !!member_id,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_id, package_id, package_price, booking_date, booking_time')
        .eq('studio_id', studioId)
        .eq('member_id', member_id)
        .eq('booking_status', 'booked')
        .is('member_package_id', null)
        .order('booking_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Pick<Booking, 'booking_id' | 'package_id' | 'package_price' | 'booking_date' | 'booking_time'>[];
    },
  });
}

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
    mutationFn: async (payment: Omit<MemberPayment, 'payment_id' | 'created_at'> & { booking_id?: string }) => {
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

      // Atomic via RPC — juga link booking jika booking_id dikirim
      const { error } = await supabase.rpc('create_member_payment', {
        p_studio_id: studioId,
        p_payment: paymentData,
        p_member_package: memberPackageData,
        p_booking_id: payment.booking_id ?? null,
      });
      if (error) throw new Error(error.message);

      return {
        ...paymentData,
        payment_id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      } as MemberPayment;
    },
    // Toast is shown by the page (one general toast for the whole save & print action).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberPayments'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['unpaidBookings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
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
    mutationFn: async (input: Omit<ProductSale, 'transaction_id' | 'created_at'>): Promise<ProductSale> => {
      const studioId = requireStudioId();

      const mergedItems = mergeSaleItems(input.items);
      const subtotal = mergedItems.reduce((sum, i) => sum + i.subtotal, 0);
      const discount = Math.max(0, input.discount ?? 0);
      const total = Math.max(0, subtotal - discount);
      const cashReceived = input.payment_method === 'cash' ? (input.cash_received ?? 0) : total;
      const change = input.payment_method === 'cash' ? Math.max(0, cashReceived - total) : 0;
      const now = new Date().toISOString();

      const sale: ProductSale = {
        ...input,
        transaction_id: crypto.randomUUID(),
        items: mergedItems,
        subtotal,
        discount,
        total,
        cash_received: cashReceived,
        change,
        created_at: now,
      };

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

      return sale;
    },
    // Toast is shown by the page (one general toast for the whole save & print action).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productSales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
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
