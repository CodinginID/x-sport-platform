import { Users, CalendarCheck, DollarSign, AlertTriangle, Dumbbell, TrendingUp } from 'lucide-react';
import { useDashboardStats } from '@/hooks';
import { StatCard, Card, Badge, TableSkeleton, QueryError } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useDashboardStats();

  if (isLoading || !data) return <div className="space-y-6"><h1 className="text-2xl font-bold">{t('dashboard.title')}</h1><TableSkeleton rows={2} cols={4} /></div>;
  if (isError) return <div className="space-y-6"><h1 className="text-2xl font-bold">{t('dashboard.title')}</h1><QueryError onRetry={() => refetch()} /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.active_members')} value={data.activeMembersCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title={t('dashboard.active_coaches')} value={data.activeCoaches.length} icon={<Dumbbell className="h-5 w-5" />} />
        <StatCard title="Total Booking" value={data.totalBookings} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard title="Total Pemasukan" value={formatCurrency(data.totalIncome)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title={t('dashboard.today_bookings')} value={data.todayBookings.length} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard title={t('dashboard.today_income')} value={formatCurrency(data.todayIncome)} icon={<DollarSign className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('dashboard.today_schedule')}>
          {data.todayBookings.length === 0 ? (
            <p className="text-gray-400 text-sm italic">{t('dashboard.no_bookings')}</p>
          ) : (
            <ul className="space-y-2">
              {data.todayBookings.map((b) => (
                <li key={b.booking_id} className="flex justify-between items-center text-sm border-b border-zen-brand/5 pb-2">
                  <span>{b.booking_time}</span>
                  <Badge variant="info">{b.booking_status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t('dashboard.low_stock')}>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-400 text-sm italic">{t('dashboard.stock_ok')}</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStockProducts.map((p) => (
                <li key={p.product_id} className="flex justify-between items-center text-sm border-b border-zen-brand/5 pb-2">
                  <span>{p.product_name}</span>
                  <Badge variant="warning">{t('dashboard.remaining')} {p.stock}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
