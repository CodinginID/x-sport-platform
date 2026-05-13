import { Users, CalendarCheck, DollarSign, AlertTriangle, Dumbbell } from 'lucide-react';
import { useDashboardStats } from '@/hooks';
import { StatCard, Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/utils';

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading || !data) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Member Aktif" value={data.activeMembersCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Booking Hari Ini" value={data.todayBookings.length} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard title="Pemasukan Hari Ini" value={formatCurrency(data.todayIncome)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Coach Aktif" value={data.activeCoachesToday.length} icon={<Dumbbell className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Jadwal Hari Ini">
          {data.todayBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Tidak ada booking hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {data.todayBookings.map((b) => (
                <li key={b.booking_id} className="flex justify-between items-center text-sm border-b pb-2">
                  <span>{b.booking_time}</span>
                  <Badge variant="info">{b.booking_status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Stok Menipis">
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">Semua stok aman.</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStockProducts.map((p) => (
                <li key={p.product_id} className="flex justify-between items-center text-sm border-b pb-2">
                  <span>{p.product_name}</span>
                  <Badge variant="warning">Sisa {p.stock}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
