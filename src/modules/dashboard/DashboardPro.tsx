import { TrendingUp, CalendarCheck, Users, Gauge, Package, Dumbbell, Clock } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useDashboardPro, type DashboardProData } from '@/hooks/useDashboardPro';
import { TableSkeleton, QueryError } from '@/components/ui';
import { formatCurrency } from '@/utils';

const BRAND = '#16a34a';

function KpiCard({ icon, label, value, hero }: { icon: React.ReactNode; label: string; value: string; hero?: boolean }) {
  if (hero) {
    return (
      <div className="col-span-2 bg-zen-brand rounded-3xl p-6 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">{label}</p>
        <p className="text-4xl font-bold tracking-tight">{value}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
      <div className="text-zen-ink/20 mb-3">{icon}</div>
      <p className="text-2xl font-bold leading-none mb-1">{value}</p>
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">{title}</p>
      <div className="h-56 -ml-2">{children}</div>
    </div>
  );
}

function TopList({ title, icon, items, emptyText }: { title: string; icon: React.ReactNode; items: { name: string; count: number }[]; emptyText: string }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-zen-ink/30 text-center py-8">{emptyText}</p>
      ) : (
        <div className="divide-y divide-zen-ink/5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl bg-zen-brand/10 text-zen-brand flex items-center justify-center shrink-0">{icon}</div>
                <p className="text-sm font-medium">{it.name}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zen-brand/10 text-zen-brand">{it.count}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard premium ber-grafik. Bila `data` diberikan (mis. untuk preview), render langsung
 * tanpa fetch; selain itu ambil via useDashboardPro.
 */
export function DashboardPro({ data: provided }: { data?: DashboardProData } = {}) {
  const query = useDashboardPro();
  const usingProvided = provided !== undefined;
  const data = usingProvided ? provided : query.data;
  const isLoading = !usingProvided && query.isLoading;
  const isError = !usingProvided && query.isError;

  if (isLoading || !data) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Pro</h1>
      <TableSkeleton rows={2} cols={4} />
    </div>
  );
  if (isError) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Pro</h1>
      <QueryError onRetry={() => query.refetch()} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-zen-brand" />
        <h1 className="text-2xl font-bold">Dashboard Pro</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard hero label="Pendapatan Bulan Ini" value={formatCurrency(data.revenueThisMonth)} icon={null} />
        <KpiCard label="Kehadiran (bulan ini)" value={String(data.attendanceThisMonth)} icon={<CalendarCheck size={20} />} />
        <KpiCard label="Member Aktif" value={String(data.activeMembers)} icon={<Users size={20} />} />
        <KpiCard label="Okupansi Rata-rata" value={`${data.avgOccupancy}%`} icon={<Gauge size={20} />} />
      </div>

      {/* Pendapatan 30 hari */}
      <ChartCard title="Tren Pendapatan 30 Hari">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.revenueDaily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={4} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l: string) => `Tgl ${l}`}
              contentStyle={{ borderRadius: 16, border: '1px solid #00000010', fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Kehadiran harian + Jam tersibuk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Kehadiran Harian (30 hari)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.attendanceDaily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip labelFormatter={(l: string) => `Tgl ${l}`} contentStyle={{ borderRadius: 16, border: '1px solid #00000010', fontSize: 12 }} />
              <Bar dataKey="value" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jam Tersibuk">
          {data.busiestHours.length === 0 ? (
            <p className="text-sm text-zen-ink/30 text-center py-16">Belum ada data booking.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.busiestHours} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #00000010', fontSize: 12 }} />
                <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopList title="Paket Terlaris" icon={<Package size={15} />} items={data.topPackages} emptyText="Belum ada data paket." />
        <TopList title="Coach Teraktif" icon={<Dumbbell size={15} />} items={data.topCoaches} emptyText="Belum ada data coach." />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-zen-ink/30">
        <Clock size={12} /> Data 30 hari terakhir, lingkup studio Anda.
      </p>
    </div>
  );
}

export default DashboardPro;
