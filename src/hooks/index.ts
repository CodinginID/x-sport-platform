import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/database/db';
import type { Member, Coach, Product, Package, MemberPackage, Booking, ProductSale, MemberPayment, CoachCommission } from '@/types';
import { generateId } from '@/utils';
import { addDays } from 'date-fns';

// Members
export function useMembers(includeInactive = false) {
  return useQuery({
    queryKey: ['members', { includeInactive }],
    queryFn: async () => {
      const all = await db.members.toArray();
      return includeInactive ? all : all.filter(m => m.status_active);
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => db.members.get(id),
    enabled: !!id,
  });
}

export function useMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'archive'; member: Partial<Member> }) => {
      const now = new Date().toISOString();
      if (data.action === 'add') {
        const member: Member = {
          member_id: generateId(),
          full_name: data.member.full_name || '',
          phone_number: data.member.phone_number || '',
          email: data.member.email || '',
          gender: data.member.gender || 'other',
          birth_date: data.member.birth_date || '',
          address: data.member.address || '',
          join_date: now.split('T')[0],
          status_active: true,
          notes: data.member.notes || '',
          created_at: now,
          updated_at: now,
        };
        await db.members.add(member);
        return member;
      }
      if (data.action === 'archive') {
        await db.members.update(data.member.member_id!, { status_active: false, updated_at: now });
      } else {
        await db.members.update(data.member.member_id!, { ...data.member, updated_at: now });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

// Coaches
export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: () => db.coaches.toArray(),
  });
}

export function useCoachMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update'; coach: Partial<Coach> }) => {
      const now = new Date().toISOString();
      if (data.action === 'add') {
        const coach: Coach = {
          coach_id: generateId(),
          full_name: data.coach.full_name || '',
          phone_number: data.coach.phone_number || '',
          email: data.coach.email || '',
          commission_type: data.coach.commission_type || 'percentage',
          commission_percentage: data.coach.commission_percentage ?? 0,
          active_status: data.coach.active_status ?? true,
          notes: data.coach.notes || '',
          created_at: now,
          updated_at: now,
        };
        await db.coaches.add(coach);
        return coach;
      }
      await db.coaches.update(data.coach.coach_id!, { ...data.coach, updated_at: now });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coaches'] }); },
  });
}

// Products
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });
}

export function useProductMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'adjust_stock'; product: Partial<Product>; adjustment?: number }) => {
      const now = new Date().toISOString();
      if (data.action === 'add') {
        const product: Product = {
          product_id: generateId(),
          product_name: data.product.product_name || '',
          category: data.product.category || '',
          stock: data.product.stock ?? 0,
          unit: data.product.unit || 'pcs',
          selling_price: data.product.selling_price ?? 0,
          cost_price: data.product.cost_price ?? 0,
          active_status: data.product.active_status ?? true,
          created_at: now,
          updated_at: now,
        };
        await db.products.add(product);
        return product;
      }
      if (data.action === 'adjust_stock') {
        const existing = await db.products.get(data.product.product_id!);
        if (existing) {
          await db.products.update(data.product.product_id!, { stock: existing.stock + (data.adjustment ?? 0), updated_at: now });
        }
      } else {
        await db.products.update(data.product.product_id!, { ...data.product, updated_at: now });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

// Packages
export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: () => db.packages.toArray(),
  });
}

export function usePackageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update'; pkg: Partial<Package> }) => {
      const now = new Date().toISOString();
      if (data.action === 'add') {
        const pkg: Package = {
          package_id: generateId(),
          package_name: data.pkg.package_name || '',
          package_type: data.pkg.package_type || 'session',
          session_count: data.pkg.session_count ?? null,
          valid_days: data.pkg.valid_days ?? 30,
          package_price: data.pkg.package_price ?? 0,
          description: data.pkg.description || '',
          active_status: data.pkg.active_status ?? true,
          created_at: now,
          updated_at: now,
        };
        await db.packages.add(pkg);
        return pkg;
      }
      await db.packages.update(data.pkg.package_id!, { ...data.pkg, updated_at: now });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); },
  });
}

// Bookings
export function useBookings(filters?: { date?: string; status?: string; member_id?: string; coach_id?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      let results = await db.bookings.toArray();
      if (filters?.date) results = results.filter(b => b.booking_date === filters.date);
      if (filters?.status) results = results.filter(b => b.booking_status === filters.status);
      if (filters?.member_id) results = results.filter(b => b.member_id === filters.member_id);
      if (filters?.coach_id) results = results.filter(b => b.coach_id === filters.coach_id);
      return results;
    },
  });
}

export function useBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'create' | 'attend' | 'cancel'; booking: Partial<Booking> }) => {
      const now = new Date().toISOString();
      if (data.action === 'create') {
        const booking: Booking = {
          booking_id: generateId(),
          booking_date: data.booking.booking_date || now.split('T')[0],
          booking_time: data.booking.booking_time || '',
          member_id: data.booking.member_id || '',
          coach_id: data.booking.coach_id || '',
          package_id: data.booking.package_id || '',
          member_package_id: data.booking.member_package_id || '',
          package_price: data.booking.package_price ?? 0,
          booking_status: 'booked',
          created_at: now,
          updated_at: now,
        };
        await db.bookings.add(booking);
        return booking;
      }
      if (data.action === 'cancel') {
        await db.bookings.update(data.booking.booking_id!, { booking_status: 'cancelled', updated_at: now });
        return;
      }
      // attend / check-in
      const booking = await db.bookings.get(data.booking.booking_id!);
      if (!booking) throw new Error('Booking not found');

      // decrement remaining sessions
      if (booking.member_package_id) {
        const mp = await db.memberPackages.get(booking.member_package_id);
        if (mp && mp.remaining_sessions > 0) {
          const newRemaining = mp.remaining_sessions - 1;
          await db.memberPackages.update(mp.member_package_id, {
            remaining_sessions: newRemaining,
            status: newRemaining <= 0 ? 'depleted' : 'active',
          });
        }
      }

      // create commission
      const coach = await db.coaches.get(booking.coach_id);
      if (coach) {
        const commission: CoachCommission = {
          commission_id: generateId(),
          coach_id: coach.coach_id,
          booking_id: booking.booking_id,
          member_id: booking.member_id,
          package_price: booking.package_price,
          commission_percentage: coach.commission_percentage,
          commission_amount: booking.package_price * coach.commission_percentage / 100,
          date: booking.booking_date,
          created_at: now,
        };
        await db.coachCommissions.add(commission);
      }
      await db.bookings.update(booking.booking_id, { booking_status: 'attended', updated_at: now });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['coachCommissions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Member Packages
export function useMemberPackages(member_id?: string) {
  return useQuery({
    queryKey: ['memberPackages', member_id],
    queryFn: async () => {
      if (member_id) return db.memberPackages.where('member_id').equals(member_id).toArray();
      return db.memberPackages.toArray();
    },
  });
}

// Member Payments
export function useMemberPayments(filters?: { member_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['memberPayments', filters],
    queryFn: async () => {
      let results = await db.memberPayments.toArray();
      if (filters?.member_id) results = results.filter(p => p.member_id === filters.member_id);
      if (filters?.startDate) results = results.filter(p => p.payment_date >= filters.startDate!);
      if (filters?.endDate) results = results.filter(p => p.payment_date <= filters.endDate!);
      return results;
    },
  });
}

export function useMemberPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<MemberPayment, 'payment_id' | 'created_at'>) => {
      const now = new Date().toISOString();
      const newPayment: MemberPayment = { ...payment, payment_id: generateId(), created_at: now };
      await db.memberPayments.add(newPayment);
      // create memberPackage
      const pkg = await db.packages.get(payment.package_id);
      if (pkg) {
        const mp: MemberPackage = {
          member_package_id: generateId(),
          member_id: payment.member_id,
          package_id: payment.package_id,
          purchase_date: payment.payment_date,
          expired_date: addDays(new Date(payment.payment_date), pkg.valid_days).toISOString().split('T')[0],
          total_sessions: pkg.session_count ?? 0,
          remaining_sessions: pkg.session_count ?? 0,
          status: 'active',
          created_at: now,
        };
        await db.memberPackages.add(mp);
      }
      return newPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberPayments'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Product Sales
export function useProductSales(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['productSales', filters],
    queryFn: async () => {
      let results = await db.productSales.toArray();
      if (filters?.startDate) results = results.filter(s => s.transaction_date >= filters.startDate!);
      if (filters?.endDate) results = results.filter(s => s.transaction_date <= filters.endDate!);
      return results;
    },
  });
}

export function useProductSaleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Omit<ProductSale, 'transaction_id' | 'created_at'>) => {
      const now = new Date().toISOString();
      const newSale: ProductSale = { ...sale, transaction_id: generateId(), created_at: now };
      await db.productSales.add(newSale);
      // decrement stock for each item
      for (const item of sale.items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          await db.products.update(item.product_id, { stock: product.stock - item.quantity, updated_at: now });
        }
      }
      return newSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productSales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Coach Commissions
export function useCoachCommissions(filters?: { coach_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['coachCommissions', filters],
    queryFn: async () => {
      let results = await db.coachCommissions.toArray();
      if (filters?.coach_id) results = results.filter(c => c.coach_id === filters.coach_id);
      if (filters?.startDate) results = results.filter(c => c.date >= filters.startDate!);
      if (filters?.endDate) results = results.filter(c => c.date <= filters.endDate!);
      return results;
    },
  });
}

// Dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [allMembers, bookings, payments, sales, products, coaches] = await Promise.all([
        db.members.toArray(),
        db.bookings.toArray(),
        db.memberPayments.toArray(),
        db.productSales.toArray(),
        db.products.toArray(),
        db.coaches.toArray(),
      ]);
      const activeMembersCount = allMembers.filter(m => m.status_active).length;
      const todayBookings = bookings.filter(b => b.booking_date === today);
      const todayPayments = payments.filter(p => p.payment_date === today);
      const todaySales = sales.filter(s => s.transaction_date === today);
      const todayIncome = todayPayments.reduce((sum, p) => sum + p.amount, 0) + todaySales.reduce((sum, s) => sum + s.total, 0);
      const lowStockProducts = products.filter(p => p.stock < 5 && p.active_status);
      const coachIdsToday = new Set(todayBookings.map(b => b.coach_id));
      const activeCoachesToday = coaches.filter(c => coachIdsToday.has(c.coach_id));
      return { activeMembersCount, todayBookings, todayIncome, lowStockProducts, activeCoachesToday };
    },
  });
}
