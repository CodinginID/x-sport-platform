import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, CheckCircle2, Wifi, Clock, ShieldOff, AlertTriangle, Sparkles, Calendar } from 'lucide-react';
import { useSuperadminStats } from '@/hooks/useSuperadminStats';
import { daysUntil, formatDate } from '../types';
import type { LicenseRow } from '../types';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #0000000d',
  fontSize: 12,
  boxShadow: '0 4px 16px #0000000f',
};

function KpiCard({ icon, label, value, color, bg, loading }: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string; loading: boolean;
}) {
  return (
    <div className={`rounded-3xl p-4 border ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">{label}</p>
      </div>
      <p className="text-2xl font-bold text-zen-ink">{loading ? '—' : value}</p>
    </div>
  );
}

export default function SuperDashboardTab({ rows, loading }: { rows: LicenseRow[]; loading: boolean }) {
  const stats = useSuperadminStats(rows);
  const maxPlan = Math.max(1, ...stats.planDistribution.map(p => p.count));

  return (
    <div className="space-y-5">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <KpiCard loading={loading} label="Total" value={stats.total}
          icon={<Users size={14} className="text-zen-ink/60" />}
          color="bg-zen-ink/5" bg="bg-white border-zen-ink/5" />
        <KpiCard loading={loading} label="Aktif" value={stats.active}
          icon={<CheckCircle2 size={14} className="text-green-500" />}
          color="bg-green-50" bg="bg-green-50/50 border-green-100" />
        <KpiCard loading={loading} label="Online" value={stats.online}
          icon={<Wifi size={14} className="text-emerald-600" />}
          color="bg-emerald-50" bg="bg-emerald-50/50 border-emerald-100" />
        <KpiCard loading={loading} label="Menunggu" value={stats.pending}
          icon={<Clock size={14} className="text-amber-500" />}
          color="bg-amber-50" bg="bg-amber-50/50 border-amber-100" />
        <KpiCard loading={loading} label="Dinonaktifkan" value={stats.disabled}
          icon={<ShieldOff size={14} className="text-red-400" />}
          color="bg-red-50" bg="bg-red-50/40 border-red-100" />
        <KpiCard loading={loading} label="Mau Expired" value={stats.expiringSoon}
          icon={<AlertTriangle size={14} className="text-orange-500" />}
          color="bg-orange-50" bg="bg-orange-50/50 border-orange-100" />
        <KpiCard loading={loading} label="Pakai Pro" value={stats.proUsers}
          icon={<Sparkles size={14} className="text-zen-brand" />}
          color="bg-zen-brand/10" bg="bg-zen-brand/5 border-zen-brand/10" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Grafik pendaftaran per bulan ── */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Pendaftaran per Bulan</h2>
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30">12 bulan terakhir</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.signupsByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={0} />
                <Tooltip cursor={{ fill: '#0000000a' }} contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v} studio`, 'Pendaftaran']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Distribusi plan ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold mb-4">Distribusi Plan</h2>
          {stats.planDistribution.length === 0 ? (
            <p className="text-sm text-zen-ink/40 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {stats.planDistribution.map(p => (
                <div key={p.plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-zen-ink/60">{p.plan}</span>
                    <span className="text-xs font-bold text-zen-ink">{p.count}</span>
                  </div>
                  <div className="h-2 bg-zen-ink/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-zen-brand" style={{ width: `${Math.round((p.count / maxPlan) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── List mau expired ≤14 hari ── */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} className="text-orange-500" />
          <h2 className="text-sm font-bold">Mau Expired (≤14 hari)</h2>
          <span className="ml-auto text-[10px] uppercase tracking-widest font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
            {stats.expiringList.length}
          </span>
        </div>
        {stats.expiringList.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={26} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-zen-ink/40">Tidak ada lisensi yang mau expired dalam 14 hari</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.expiringList.map(r => {
              const d = daysUntil(r.expires_at);
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-zen-ink/5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.studio_name || 'Tanpa nama'}</p>
                    <p className="text-[11px] text-zen-ink/40 truncate">{r.owner_email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${d <= 7 ? 'text-red-500' : 'text-orange-500'}`}>{d}h lagi</p>
                    <p className="text-[10px] text-zen-ink/30">{formatDate(r.expires_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
