import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId } from '@/utils/studioContext';

export interface DailyPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Short label dd/mm untuk sumbu chart. */
  label: string;
  value: number;
}

export interface HourPoint {
  /** Jam (HH) format 2 digit. */
  hour: string;
  count: number;
}

export interface TopItem {
  name: string;
  count: number;
}

export interface DashboardProData {
  /** KPI ringkas. */
  revenueThisMonth: number;
  attendanceThisMonth: number;
  activeMembers: number;
  avgOccupancy: number; // 0..100 (%)
  /** Time-series. */
  revenueDaily: DailyPoint[];
  attendanceDaily: DailyPoint[];
  busiestHours: HourPoint[];
  topPackages: TopItem[];
  topCoaches: TopItem[];
}

const DAYS = 30;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}

function emptyData(): DashboardProData {
  return {
    revenueThisMonth: 0,
    attendanceThisMonth: 0,
    activeMembers: 0,
    avgOccupancy: 0,
    revenueDaily: [],
    attendanceDaily: [],
    busiestHours: [],
    topPackages: [],
    topCoaches: [],
  };
}

export function useDashboardPro() {
  return useQuery<DashboardProData>({
    queryKey: ['dashboard-pro'],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return emptyData();

      const dates = lastNDates(DAYS);
      const since = dates[0];
      const monthStart = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

      const [
        { data: payments },
        { data: sales },
        { data: bookings },
        { data: sessions },
        { data: members },
        { data: packages },
        { data: coaches },
      ] = await Promise.all([
        supabase.from('member_payments').select('payment_date, amount').eq('studio_id', studioId).gte('payment_date', since),
        supabase.from('product_sales').select('transaction_date, total').eq('studio_id', studioId).gte('transaction_date', since),
        supabase.from('bookings').select('booking_date, booking_time, booking_status, package_id, coach_id, training_session_id').eq('studio_id', studioId).gte('booking_date', since),
        supabase.from('training_sessions').select('training_session_id, session_date, capacity, status').eq('studio_id', studioId).gte('session_date', since),
        supabase.from('members').select('status_active').eq('studio_id', studioId),
        supabase.from('packages').select('package_id, package_name').eq('studio_id', studioId),
        supabase.from('coaches').select('coach_id, full_name').eq('studio_id', studioId),
      ]);

      // --- Maps untuk label ---
      const pkgMap = new Map<string, string>((packages ?? []).map((p) => [p.package_id, p.package_name]));
      const coachMap = new Map<string, string>((coaches ?? []).map((c) => [c.coach_id, c.full_name]));

      // --- Pendapatan harian (member_payments + product_sales) ---
      const revByDate = new Map<string, number>(dates.map((d) => [d, 0]));
      for (const p of payments ?? []) {
        if (p.payment_date && revByDate.has(p.payment_date)) {
          revByDate.set(p.payment_date, (revByDate.get(p.payment_date) ?? 0) + (p.amount ?? 0));
        }
      }
      for (const s of sales ?? []) {
        if (s.transaction_date && revByDate.has(s.transaction_date)) {
          revByDate.set(s.transaction_date, (revByDate.get(s.transaction_date) ?? 0) + (s.total ?? 0));
        }
      }

      // --- Kehadiran harian (bookings attended) ---
      const attByDate = new Map<string, number>(dates.map((d) => [d, 0]));
      const attendedBookings = (bookings ?? []).filter((b) => b.booking_status === 'attended');
      for (const b of attendedBookings) {
        if (b.booking_date && attByDate.has(b.booking_date)) {
          attByDate.set(b.booking_date, (attByDate.get(b.booking_date) ?? 0) + 1);
        }
      }

      const toDaily = (m: Map<string, number>): DailyPoint[] =>
        dates.map((d) => ({ date: d, label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: m.get(d) ?? 0 }));

      const revenueDaily = toDaily(revByDate);
      const attendanceDaily = toDaily(attByDate);

      // --- Jam tersibuk (distribusi booking_time, semua status non-cancelled) ---
      const hourMap = new Map<string, number>();
      for (const b of bookings ?? []) {
        if (b.booking_status === 'cancelled') continue;
        const hh = (b.booking_time ?? '').slice(0, 2);
        if (!hh) continue;
        hourMap.set(hh, (hourMap.get(hh) ?? 0) + 1);
      }
      const busiestHours: HourPoint[] = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // --- Okupansi sesi: rata-rata (peserta non-cancelled / kapasitas) ---
      const participantsBySession = new Map<string, number>();
      for (const b of bookings ?? []) {
        if (b.booking_status === 'cancelled' || !b.training_session_id) continue;
        participantsBySession.set(
          b.training_session_id,
          (participantsBySession.get(b.training_session_id) ?? 0) + 1,
        );
      }
      const activeSessions = (sessions ?? []).filter((s) => s.status !== 'cancelled' && (s.capacity ?? 0) > 0);
      let occSum = 0;
      for (const s of activeSessions) {
        const filled = participantsBySession.get(s.training_session_id) ?? 0;
        occSum += Math.min(1, filled / s.capacity);
      }
      const avgOccupancy = activeSessions.length ? Math.round((occSum / activeSessions.length) * 100) : 0;

      // --- Paket terlaris (dari bookings non-cancelled) ---
      const pkgCount = new Map<string, number>();
      const coachCount = new Map<string, number>();
      for (const b of bookings ?? []) {
        if (b.booking_status === 'cancelled') continue;
        if (b.package_id) pkgCount.set(b.package_id, (pkgCount.get(b.package_id) ?? 0) + 1);
        if (b.coach_id) coachCount.set(b.coach_id, (coachCount.get(b.coach_id) ?? 0) + 1);
      }
      const topN = (m: Map<string, number>, label: Map<string, string>): TopItem[] =>
        Array.from(m.entries())
          .map(([id, count]) => ({ name: label.get(id) ?? '—', count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

      const topPackages = topN(pkgCount, pkgMap);
      const topCoaches = topN(coachCount, coachMap);

      // --- KPI bulan ini ---
      const revenueThisMonth =
        (payments ?? []).filter((p) => p.payment_date >= monthStart).reduce((s, p) => s + (p.amount ?? 0), 0) +
        (sales ?? []).filter((s) => s.transaction_date >= monthStart).reduce((sum, s) => sum + (s.total ?? 0), 0);
      const attendanceThisMonth = attendedBookings.filter((b) => b.booking_date >= monthStart).length;
      const activeMembers = (members ?? []).filter((m) => m.status_active).length;

      return {
        revenueThisMonth,
        attendanceThisMonth,
        activeMembers,
        avgOccupancy,
        revenueDaily,
        attendanceDaily,
        busiestHours,
        topPackages,
        topCoaches,
      };
    },
  });
}
