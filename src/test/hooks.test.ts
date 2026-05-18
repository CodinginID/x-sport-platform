import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { db } from '@/database/db';
import {
  useProducts,
  useProductMutation,
  useMemberPaymentMutation,
  useBookingMutation,
  useDashboardStats,
} from '@/hooks';
import React from 'react';

// Mock backup to avoid supabase dependency
vi.mock('@/utils/backup', () => ({ scheduleBackup: vi.fn() }));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

async function clearDB() {
  await Promise.all([
    db.members.clear(),
    db.coaches.clear(),
    db.products.clear(),
    db.packages.clear(),
    db.memberPackages.clear(),
    db.bookings.clear(),
    db.productSales.clear(),
    db.memberPayments.clear(),
    db.coachCommissions.clear(),
  ]);
}

beforeEach(async () => {
  await clearDB();
});

describe('useProducts', () => {
  it('fetches products from db', async () => {
    await db.products.add({
      product_id: 'p1',
      product_name: 'Yoga Mat',
      category: 'equipment',
      stock: 10,
      unit: 'pcs',
      selling_price: 100000,
      cost_price: 50000,
      active_status: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const { result } = renderHook(() => useProducts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].product_name).toBe('Yoga Mat');
  });
});

describe('useProductMutation', () => {
  it('add product creates record with generated ID', async () => {
    const { result } = renderHook(() => useProductMutation(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      action: 'add',
      product: { product_name: 'Bottle', category: 'drink', stock: 5, selling_price: 15000, cost_price: 8000 },
    });

    const products = await db.products.toArray();
    expect(products).toHaveLength(1);
    expect(products[0].product_name).toBe('Bottle');
    expect(products[0].product_id).toBeDefined();
    expect(products[0].product_id.length).toBeGreaterThan(0);
  });

  it('adjust_stock updates stock correctly', async () => {
    await db.products.add({
      product_id: 'p2',
      product_name: 'Towel',
      category: 'accessory',
      stock: 20,
      unit: 'pcs',
      selling_price: 50000,
      cost_price: 25000,
      active_status: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const { result } = renderHook(() => useProductMutation(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      action: 'adjust_stock',
      product: { product_id: 'p2' },
      adjustment: -5,
    });

    const product = await db.products.get('p2');
    expect(product!.stock).toBe(15);
  });
});

describe('useMemberPaymentMutation', () => {
  it('creating payment also creates memberPackage', async () => {
    await db.packages.add({
      package_id: 'pkg1',
      package_name: 'Yoga 10 Sessions',
      package_type: 'session',
      session_count: 10,
      valid_days: 30,
      package_price: 500000,
      description: '',
      active_status: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const { result } = renderHook(() => useMemberPaymentMutation(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      payment_date: '2024-06-01',
      member_id: 'm1',
      package_id: 'pkg1',
      amount: 500000,
      payment_method: 'cash',
      notes: '',
    });

    const payments = await db.memberPayments.toArray();
    expect(payments).toHaveLength(1);

    const memberPackages = await db.memberPackages.toArray();
    expect(memberPackages).toHaveLength(1);
    expect(memberPackages[0].member_id).toBe('m1');
    expect(memberPackages[0].package_id).toBe('pkg1');
    expect(memberPackages[0].remaining_sessions).toBe(10);
    expect(memberPackages[0].status).toBe('active');
  });
});

describe('useBookingMutation attend', () => {
  it('attending decrements remaining_sessions and creates commission', async () => {
    await db.coaches.add({
      coach_id: 'c1',
      full_name: 'Coach A',
      phone_number: '08123',
      email: 'coach@test.com',
      active_status: true,
      notes: '',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    await db.memberPackages.add({
      member_package_id: 'mp1',
      member_id: 'm1',
      package_id: 'pkg1',
      purchase_date: '2024-06-01',
      expired_date: '2024-07-01',
      total_sessions: 10,
      remaining_sessions: 8,
      status: 'active',
      created_at: '2024-01-01',
    });

    await db.bookings.add({
      booking_id: 'b1',
      booking_date: '2024-06-10',
      booking_time: '09:00',
      member_id: 'm1',
      coach_id: 'c1',
      package_id: 'pkg1',
      member_package_id: 'mp1',
      package_price: 50000,
      booking_status: 'booked',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const { result } = renderHook(() => useBookingMutation(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      action: 'attend',
      booking: { booking_id: 'b1' },
    });

    const mp = await db.memberPackages.get('mp1');
    expect(mp!.remaining_sessions).toBe(7);

    const commissions = await db.coachCommissions.toArray();
    expect(commissions).toHaveLength(1);
    expect(commissions[0].coach_id).toBe('c1');
    expect(commissions[0].commission_amount).toBe(50000 * 20 / 100);
  });
});

describe('useDashboardStats', () => {
  it('returns correct counts', async () => {
    const today = new Date().toISOString().split('T')[0];

    await db.members.bulkAdd([
      { member_id: 'm1', full_name: 'A', phone_number: '', email: '', gender: 'male', birth_date: '', address: '', join_date: today, status_active: true, notes: '', created_at: today, updated_at: today },
      { member_id: 'm2', full_name: 'B', phone_number: '', email: '', gender: 'female', birth_date: '', address: '', join_date: today, status_active: false, notes: '', created_at: today, updated_at: today },
    ]);

    await db.coaches.add({
      coach_id: 'c1', full_name: 'Coach', phone_number: '', email: '', active_status: true, notes: '', created_at: today, updated_at: today,
    });

    await db.products.add({
      product_id: 'p1', product_name: 'Low Stock Item', category: 'misc', stock: 3, unit: 'pcs', selling_price: 10000, cost_price: 5000, active_status: true, created_at: today, updated_at: today,
    });

    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.activeMembersCount).toBe(1);
    expect(result.current.data!.activeCoaches).toHaveLength(1);
    expect(result.current.data!.lowStockProducts).toHaveLength(1);
    expect(result.current.data!.totalBookings).toBe(0);
  });
});
