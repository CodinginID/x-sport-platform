import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId } from '@/utils/studioContext';
import { useStudioStore } from '@/stores/studio';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) {
        return {
          activeMembersCount: 0,
          todayBookings: [],
          todayIncome: 0,
          totalIncome: 0,
          lowStockProducts: [],
          activeCoaches: [],
          totalBookings: 0,
        };
      }

      const today = new Date().toISOString().split('T')[0];

      const [
        { data: members },
        { data: bookings },
        { data: payments },
        { data: sales },
        { data: products },
        { data: coaches },
      ] = await Promise.all([
        supabase.from('members').select('status_active').eq('studio_id', studioId),
        supabase.from('bookings').select('booking_id, booking_date, booking_time, booking_status').eq('studio_id', studioId),
        supabase.from('member_payments').select('payment_date, amount').eq('studio_id', studioId),
        supabase.from('product_sales').select('transaction_date, total').eq('studio_id', studioId),
        supabase.from('products').select('product_id, product_name, stock, unit, active_status').eq('studio_id', studioId),
        supabase.from('coaches').select('coach_id, full_name, active_status').eq('studio_id', studioId),
      ]);

      const activeMembersCount = (members ?? []).filter(m => m.status_active).length;
      const todayBookings = (bookings ?? []).filter(b => b.booking_date === today);
      const todayPayments = (payments ?? []).filter(p => p.payment_date === today);
      const todaySales = (sales ?? []).filter(s => s.transaction_date === today);
      const todayIncome =
        todayPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0) +
        todaySales.reduce((sum, s) => sum + (s.total ?? 0), 0);
      const totalIncome =
        (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0) +
        (sales ?? []).reduce((sum, s) => sum + (s.total ?? 0), 0);

      const threshold = useStudioStore.getState().lowStockThreshold;
      const lowStockProducts = (products ?? []).filter(p => p.stock < threshold && p.active_status);
      const activeCoaches = (coaches ?? []).filter(c => c.active_status);
      const totalBookings = (bookings ?? []).length;

      return { activeMembersCount, todayBookings, todayIncome, totalIncome, lowStockProducts, activeCoaches, totalBookings };
    },
  });
}
