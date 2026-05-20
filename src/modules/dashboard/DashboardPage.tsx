import { Users, CalendarCheck, Dumbbell, TrendingUp, Package } from 'lucide-react';
import { useDashboardStats } from '@/hooks';
import { TableSkeleton, QueryError } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useDashboardStats();

  if (isLoading || !data) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <TableSkeleton rows={2} cols={4} />
    </div>
  );
  if (isError) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <QueryError onRetry={() => refetch()} />
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      {/* Hero + secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 bg-zen-brand rounded-3xl p-6 text-white">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">Total Pemasukan</p>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(data.totalIncome)}</p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Hari Ini</p>
              <p className="text-sm font-bold">{formatCurrency(data.todayIncome)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Booking Hari Ini</p>
              <p className="text-sm font-bold">{data.todayBookings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <div className="text-zen-ink/20 mb-3"><Users size={20} /></div>
          <p className="text-3xl font-bold leading-none mb-1">{data.activeMembersCount}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('dashboard.active_members')}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <div className="text-zen-ink/20 mb-3"><Dumbbell size={20} /></div>
          <p className="text-3xl font-bold leading-none mb-1">{data.activeCoaches.length}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('dashboard.active_coaches')}</p>
        </div>
      </div>

      {/* Total booking secondary */}
      <div className="bg-zen-bg rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-white border border-zen-ink/5 flex items-center justify-center text-zen-brand shrink-0">
          <CalendarCheck size={18} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total Booking</p>
          <p className="text-xl font-bold">{data.totalBookings}</p>
        </div>
        <div className="w-px self-stretch bg-zen-ink/5 mx-2" />
        <div className="w-10 h-10 rounded-2xl bg-white border border-zen-ink/5 flex items-center justify-center text-zen-brand shrink-0">
          <TrendingUp size={18} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total Transaksi</p>
          <p className="text-xl font-bold">{data.totalBookings}</p>
        </div>
      </div>

      {/* Schedule + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">{t('dashboard.today_schedule')}</p>
          {data.todayBookings.length === 0 ? (
            <p className="text-sm text-zen-ink/30 text-center py-8">{t('dashboard.no_bookings')}</p>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {data.todayBookings.map(b => (
                <div key={b.booking_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-[11px] flex items-center justify-center shrink-0">
                      {b.booking_time?.slice(0, 5) || '--'}
                    </div>
                    <p className="text-sm font-medium">{b.booking_time}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    b.booking_status === 'attended' ? 'bg-green-100 text-green-700' :
                    b.booking_status === 'cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>{b.booking_status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">{t('dashboard.low_stock')}</p>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-zen-ink/30 text-center py-8">{t('dashboard.stock_ok')}</p>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {data.lowStockProducts.map(p => (
                <div key={p.product_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <Package size={16} />
                    </div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    {t('dashboard.remaining')} {p.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
