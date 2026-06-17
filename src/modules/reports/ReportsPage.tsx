import { useState, useMemo } from 'react';
import {
  useMembers, useCoaches, useProductSales, useMemberPayments,
  useMemberPackages, useCoachCommissions, useBookings, usePackages,
} from '@/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/hooks/useFeature';
import { formatCurrency, formatDate } from '@/utils';
import { generateReport, previewPdf } from '@/utils/pdf';
import { exportToExcel } from '@/utils/excel';
import { BarChartH, TrendBars } from '@/components/ui';
import { PrintPreview } from '@/components/PrintPreview';
import { SalesChart, PaymentsChart, CommissionChart, ProfitChart } from './ReportCharts';
import {
  ShoppingBag, CreditCard, User, Users, Award,
  TrendingUp, Download, ChevronRight, ArrowUpRight,
  ArrowDownRight, Calendar, FileSpreadsheet,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'sales' | 'payments' | 'member_detail' | 'member_balance' | 'commission' | 'profit';

interface Tab { id: TabId; label: string; icon: React.ReactNode }

// ─── Date preset ─────────────────────────────────────────────────────────────

type Preset = '7d' | '30d' | 'month' | 'custom';

function getPresetDates(preset: Preset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (preset === '7d') {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    return { start: s.toISOString().split('T')[0], end };
  }
  if (preset === '30d') {
    const s = new Date(now); s.setDate(s.getDate() - 29);
    return { start: s.toISOString().split('T')[0], end };
  }
  // month — full calendar month (1st → last day), so entries dated later this month
  // (e.g. a commission from a booking dated later today/this month) are included.
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function sessionPct(remaining: number, total: number) {
  if (!total) return 0;
  return Math.round((remaining / total) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroMetric({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl p-6 ${accent ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/5'}`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${accent ? 'text-white/60' : 'text-zen-ink/40'}`}>{label}</p>
      <p className={`text-3xl font-bold tracking-tight leading-none ${accent ? 'text-white' : 'text-zen-ink'}`}>{value}</p>
      {sub && <p className={`text-xs mt-2 ${accent ? 'text-white/50' : 'text-zen-ink/40'}`}>{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, icon, color = 'default' }: { label: string; value: string | number; icon: React.ReactNode; color?: 'default' | 'green' | 'red' | 'amber' }) {
  const colors = { default: 'bg-zen-bg text-zen-ink', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700' };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="opacity-60">{icon}</div>
      </div>
      <p className="text-xl font-bold leading-none mb-1">{value}</p>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">{label}</p>
    </div>
  );
}

function ListRow({ left, right, sub }: { left: string; right: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zen-ink/5 last:border-0">
      <div>
        <p className="text-sm font-medium text-zen-ink">{left}</p>
        {sub && <p className="text-xs text-zen-ink/40 mt-0.5">{sub}</p>}
      </div>
      <p className="text-sm font-bold text-zen-ink shrink-0 ml-4">{right}</p>
    </div>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
  return (
    <div className={`${s} rounded-2xl bg-zen-brand/10 text-zen-brand font-bold flex items-center justify-center shrink-0`}>
      {initials(name)}
    </div>
  );
}

function SectionHeader({ title, onExport, onExportExcel }: { title: string; onExport?: () => void; onExportExcel?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-zen-ink">{title}</h3>
      <div className="flex items-center gap-1">
        {onExportExcel && (
          <button onClick={onExportExcel} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zen-brand hover:text-zen-ink transition-colors py-2 px-3 rounded-xl hover:bg-zen-bg">
            <FileSpreadsheet size={13} /> Export Excel
          </button>
        )}
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zen-brand hover:text-zen-ink transition-colors py-2 px-3 rounded-xl hover:bg-zen-bg">
            <Download size={13} /> Export PDF
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-center text-sm text-zen-ink/30 py-10">{label}</p>;
}

// ─── Date filter bar ─────────────────────────────────────────────────────────

function DateFilterBar({ preset, startDate, endDate, onChange }: {
  preset: Preset;
  startDate: string;
  endDate: string;
  onChange: (preset: Preset, start: string, end: string) => void;
}) {
  const presets: { id: Preset; label: string }[] = [
    { id: '7d', label: '7 Hari' },
    { id: '30d', label: '30 Hari' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => {
              if (p.id === 'custom') { onChange('custom', startDate, endDate); return; }
              const dates = getPresetDates(p.id);
              onChange(p.id, dates.start, dates.end);
            }}
            className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all ${
              preset === p.id ? 'bg-zen-brand text-white shadow-sm' : 'bg-zen-bg text-zen-ink/50 hover:text-zen-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
            <input type="date" value={startDate} onChange={e => onChange('custom', e.target.value, endDate)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
          </div>
          <span className="text-zen-ink/30">—</span>
          <div className="flex-1 relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
            <input type="date" value={endDate} onChange={e => onChange('custom', startDate, e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report sections ──────────────────────────────────────────────────────────

function SalesReport({ sales, isPro, onExport, onExportExcel }: { sales: any[]; isPro: boolean; onExport: () => void; onExportExcel: () => void }) {
  const total = sales.reduce((s, r) => s + r.total, 0);
  const avg = sales.length ? total / sales.length : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroMetric label="Total Penjualan" value={formatCurrency(total)} sub={`${sales.length} transaksi`} accent />
        <MetricCard label="Rata-rata" value={formatCurrency(avg)} icon={<TrendingUp size={16} />} />
        <MetricCard label="Transaksi" value={sales.length} icon={<ShoppingBag size={16} />} />
      </div>
      {isPro && <SalesChart sales={sales} />}
      <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
        <SectionHeader title="Rincian Transaksi" onExport={onExport} onExportExcel={isPro ? onExportExcel : undefined} />
        {sales.length === 0 ? <EmptyState label="Tidak ada transaksi di periode ini" /> : (
          <div className="mt-3 divide-y divide-zen-ink/5">
            {sales.map(s => (
              <div key={s.transaction_id} className="flex items-center gap-3 py-3">
                <Avatar name={s.customer_name || '?'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.customer_name || '—'}</p>
                  <p className="text-xs text-zen-ink/40">{formatDate(s.transaction_date)}</p>
                </div>
                <p className="text-sm font-bold shrink-0">{formatCurrency(s.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentsReport({ payments, memberMap, isPro, onExport, onExportExcel }: { payments: any[]; memberMap: Record<string, string>; isPro: boolean; onExport: () => void; onExportExcel: () => void }) {
  const total = payments.reduce((s, r) => s + r.amount, 0);
  const methods = payments.reduce<Record<string, number>>((acc, p) => { acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount; return acc; }, {});
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroMetric label="Total Penerimaan" value={formatCurrency(total)} sub={`${payments.length} pembayaran`} accent />
        <MetricCard label="Tunai" value={formatCurrency(methods['cash'] || 0)} icon={<CreditCard size={16} />} color="green" />
        <MetricCard label="Transfer" value={formatCurrency(methods['transfer'] || 0)} icon={<CreditCard size={16} />} color="amber" />
      </div>
      {isPro && <PaymentsChart payments={payments} />}
      <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
        <SectionHeader title="Rincian Pembayaran" onExport={onExport} onExportExcel={isPro ? onExportExcel : undefined} />
        {payments.length === 0 ? <EmptyState label="Tidak ada pembayaran di periode ini" /> : (
          <div className="mt-3 divide-y divide-zen-ink/5">
            {payments.map(p => (
              <div key={p.payment_id} className="flex items-center gap-3 py-3">
                <Avatar name={memberMap[p.member_id] || '?'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{memberMap[p.member_id] || '—'}</p>
                  <p className="text-xs text-zen-ink/40">{formatDate(p.payment_date)}</p>
                </div>
                <p className="text-sm font-bold shrink-0">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberDetailReport({ members, bookings, memberPackages, memberPayments, packageMap, selectedMember, onSelect }: any) {
  const attended = bookings.filter((b: any) => b.booking_status === 'attended').length;
  const totalPaid = memberPayments.reduce((s: number, p: any) => s + p.amount, 0);
  const activePkgs = memberPackages.filter((p: any) => p.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zen-ink/5 overflow-hidden">
        <div className="relative">
          <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <select value={selectedMember} onChange={e => onSelect(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-zen-brand/20">
            <option value="">— Pilih Member —</option>
            {members.map((m: any) => <option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
          </select>
          <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/30 rotate-90 pointer-events-none" />
        </div>
      </div>

      {selectedMember && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Total Booking" value={bookings.length} icon={<Calendar size={16} />} />
            <MetricCard label="Hadir" value={attended} icon={<ArrowUpRight size={16} />} color="green" />
            <MetricCard label="Paket Aktif" value={activePkgs} icon={<Award size={16} />} color="amber" />
            <MetricCard label="Total Bayar" value={formatCurrency(totalPaid)} icon={<CreditCard size={16} />} />
          </div>

          <div className="bg-white rounded-3xl p-5 border border-zen-ink/5 space-y-4">
            <h3 className="text-sm font-bold">Paket & Sesi</h3>
            {memberPackages.length === 0 ? <EmptyState label="Belum ada paket" /> : (
              <div className="space-y-4">
                {memberPackages.map((p: any) => {
                  const pct = sessionPct(p.remaining_sessions, p.total_sessions);
                  const isActive = p.status === 'active';
                  return (
                    <div key={p.member_package_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">{packageMap[p.package_id] || '—'}</p>
                          <p className="text-xs text-zen-ink/40">Exp: {formatDate(p.expired_date)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {p.remaining_sessions}/{p.total_sessions} sesi
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-zen-ink/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberBalanceReport({ allMemberPackages, memberMap, packageMap, isPro, onExport, onExportExcel }: any) {
  const active = allMemberPackages.filter((p: any) => p.status === 'active').length;
  const expired = allMemberPackages.filter((p: any) => p.status === 'expired').length;
  const totalSessions = allMemberPackages.filter((p: any) => p.status === 'active').reduce((s: number, p: any) => s + p.remaining_sessions, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Paket Aktif" value={active} icon={<Award size={16} />} color="green" />
        <MetricCard label="Expired" value={expired} icon={<ArrowDownRight size={16} />} color="red" />
        <MetricCard label="Sisa Sesi" value={totalSessions} icon={<Calendar size={16} />} color="amber" />
      </div>
      <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
        <SectionHeader title="Saldo Semua Member" onExport={onExport} onExportExcel={isPro ? onExportExcel : undefined} />
        {allMemberPackages.length === 0 ? <EmptyState label="Belum ada data paket" /> : (
          <div className="mt-4 space-y-4">
            {allMemberPackages.map((p: any) => {
              const pct = sessionPct(p.remaining_sessions, p.total_sessions);
              const isActive = p.status === 'active';
              return (
                <div key={p.member_package_id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={memberMap[p.member_id] || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate">{memberMap[p.member_id] || '—'}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {p.remaining_sessions}/{p.total_sessions}
                        </span>
                      </div>
                      <p className="text-xs text-zen-ink/40 truncate">{packageMap[p.package_id] || '—'} · {formatDate(p.expired_date)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zen-ink/5 rounded-full overflow-hidden ml-11">
                    <div className={`h-full rounded-full ${pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
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

function CommissionReport({ commissions, coaches, coachMap, memberMap, selectedCoach, onSelect, isPro, onExport, onExportExcel }: any) {
  const total = commissions.reduce((s: number, r: any) => s + r.commission_amount, 0);
  const coachTotals = (commissions as any[]).reduce<Record<string, number>>((acc: Record<string, number>, c: any) => {
    acc[c.coach_id] = (acc[c.coach_id] || 0) + c.commission_amount; return acc;
  }, {});
  const coachChartData = Object.entries(coachTotals).map(([cid, amt]) => ({ label: coachMap[cid] || '—', value: amt as number }));
  const trendData = (() => {
    const byDate: Record<string, number> = {};
    for (const c of commissions as any[]) byDate[c.date] = (byDate[c.date] || 0) + c.commission_amount;
    return Object.keys(byDate).sort().map(d => ({ label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: byDate[d] }));
  })();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zen-ink/5 overflow-hidden">
        <div className="relative">
          <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <select value={selectedCoach} onChange={e => onSelect(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-zen-brand/20">
            <option value="">— Semua Pelatih —</option>
            {coaches.map((c: any) => <option key={c.coach_id} value={c.coach_id}>{c.full_name}</option>)}
          </select>
          <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/30 rotate-90 pointer-events-none" />
        </div>
      </div>

      {isPro && <CommissionChart commissions={commissions} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HeroMetric label="Total Komisi" value={formatCurrency(total)} sub={`${commissions.length} transaksi`} accent />
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-3">Per Pelatih</p>
          {Object.entries(coachTotals).length === 0 ? <p className="text-xs text-zen-ink/30">—</p> : (
            <div className="space-y-2">
              {Object.entries(coachTotals).map(([cid, amt]) => (
                <ListRow key={cid} left={coachMap[cid] || '—'} right={formatCurrency(amt as number)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {coachChartData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Komisi per Pelatih</p>
          <BarChartH data={coachChartData} formatValue={formatCurrency} />
        </div>
      )}

      {trendData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Tren Komisi Harian</p>
          <TrendBars data={trendData} formatValue={formatCurrency} />
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
        <SectionHeader title="Rincian Komisi" onExport={onExport} onExportExcel={isPro ? onExportExcel : undefined} />
        {commissions.length === 0 ? <EmptyState label="Tidak ada komisi di periode ini" /> : (
          <div className="mt-3 divide-y divide-zen-ink/5">
            {commissions.map((c: any) => (
              <div key={c.commission_id} className="flex items-center gap-3 py-3">
                <Avatar name={coachMap[c.coach_id] || '?'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{coachMap[c.coach_id] || '—'}</p>
                  <p className="text-xs text-zen-ink/40">{memberMap[c.member_id] || '—'} · {formatDate(c.date)}</p>
                </div>
                <p className="text-sm font-bold shrink-0 text-zen-brand">{formatCurrency(c.commission_amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfitReport({ payments, sales, commissions, isPro, onExport, onExportExcel }: any) {
  const tp = payments.reduce((s: number, r: any) => s + r.amount, 0);
  const ts = sales.reduce((s: number, r: any) => s + r.total, 0);
  const tc = commissions.reduce((s: number, r: any) => s + r.commission_amount, 0);
  const gross = tp + ts;
  const net = gross - tc;
  const marginPct = gross ? Math.round((net / gross) * 100) : 0;

  const items = [
    { label: 'Pembayaran Member', value: tp, icon: <Users size={16} />, color: 'green' as const },
    { label: 'Penjualan Produk', value: ts, icon: <ShoppingBag size={16} />, color: 'green' as const },
    { label: 'Komisi Pelatih', value: -tc, icon: <Award size={16} />, color: 'red' as const },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-zen-brand rounded-3xl p-6 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-3">Net Profit</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(net)}</p>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Gross</p>
            <p className="text-sm font-bold">{formatCurrency(gross)}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Margin</p>
            <p className="text-sm font-bold">{marginPct}%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Biaya</p>
            <p className="text-sm font-bold">-{formatCurrency(tc)}</p>
          </div>
        </div>
      </div>

      {isPro && <ProfitChart payments={payments} sales={sales} commissions={commissions} />}

      {/* Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
        <SectionHeader title="Breakdown" onExport={onExport} onExportExcel={isPro ? onExportExcel : undefined} />
        <div className="mt-4 space-y-3">
          {items.map(item => {
            const barPct = gross ? Math.abs(Math.round((Math.abs(item.value) / gross) * 100)) : 0;
            const isNeg = item.value < 0;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${isNeg ? 'text-red-400' : 'text-green-500'}`}>{item.icon}</div>
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  <p className={`text-sm font-bold ${isNeg ? 'text-red-500' : 'text-zen-ink'}`}>
                    {isNeg ? '-' : ''}{formatCurrency(Math.abs(item.value))}
                  </p>
                </div>
                <div className="h-1.5 bg-zen-ink/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isNeg ? 'bg-red-300' : 'bg-zen-brand'}`} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useTranslation();
  const isPro = useFeature('pro');

  const tabs: Tab[] = [
    { id: 'profit',          label: 'Profit',            icon: <TrendingUp size={15} /> },
    { id: 'sales',           label: 'Penjualan',         icon: <ShoppingBag size={15} /> },
    { id: 'payments',        label: 'Pembayaran',        icon: <CreditCard size={15} /> },
    { id: 'member_balance',  label: 'Saldo Member',      icon: <Users size={15} /> },
    { id: 'member_detail',   label: 'Detail Member',     icon: <User size={15} /> },
    { id: 'commission',      label: 'Komisi',            icon: <Award size={15} /> },
  ];

  const [activeTab, setActiveTab] = useState<TabId>('profit');
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('month').end);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');

  const handlePresetChange = (p: Preset, start: string, end: string) => {
    setPreset(p); setStartDate(start); setEndDate(end);
  };

  const needsDateFilter = !['member_detail', 'member_balance'].includes(activeTab);

  const { data: members = [] }        = useMembers(true);
  const { data: coaches = [] }        = useCoaches();
  const { data: packages = [] }       = usePackages();
  const { data: sales = [] }          = useProductSales({ startDate, endDate });
  const { data: payments = [] }       = useMemberPayments({ startDate, endDate });
  const { data: allMemberPackages = [] } = useMemberPackages();
  const { data: memberPackages = [] } = useMemberPackages(selectedMember || undefined);
  const { data: commissions = [] }    = useCoachCommissions({ coach_id: selectedCoach || undefined, startDate, endDate });
  const { data: bookings = [] }       = useBookings({ member_id: selectedMember || undefined });
  const { data: memberPayments = [] } = useMemberPayments({ member_id: selectedMember || undefined });

  const memberMap  = useMemo(() => Object.fromEntries(members.map(m => [m.member_id, m.full_name])), [members]);
  const coachMap   = useMemo(() => Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name])), [coaches]);
  const packageMap = useMemo(() => Object.fromEntries(packages.map(p => [p.package_id, p.package_name])), [packages]);

  // PDF exports
  const exportSales = async () => {
    const doc = await generateReport(`Penjualan (${formatDate(startDate)} - ${formatDate(endDate)})`,
      ['Tanggal', 'Pelanggan', 'Items', 'Total'],
      sales.map(s => [formatDate(s.transaction_date), s.customer_name, s.items.map((i: any) => `${i.product_name} x${i.quantity}`).join(', '), formatCurrency(s.total)]),
      [{ label: 'Total', value: formatCurrency(sales.reduce((s, r) => s + r.total, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('penjualan.pdf');
  };
  const exportPayments = async () => {
    const doc = await generateReport(`Pembayaran (${formatDate(startDate)} - ${formatDate(endDate)})`,
      ['Tanggal', 'Member', 'Paket', 'Jumlah', 'Metode'],
      payments.map(p => [formatDate(p.payment_date), memberMap[p.member_id] || '-', packageMap[p.package_id] || '-', formatCurrency(p.amount), p.payment_method]),
      [{ label: 'Total', value: formatCurrency(payments.reduce((s, p) => s + p.amount, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('pembayaran.pdf');
  };
  const exportBalance = async () => {
    const doc = await generateReport('Saldo Member',
      ['Member', 'Paket', 'Sisa Sesi', 'Total Sesi', 'Status', 'Expired'],
      allMemberPackages.map(p => [memberMap[p.member_id] || '-', packageMap[p.package_id] || '-', String(p.remaining_sessions), String(p.total_sessions), p.status, formatDate(p.expired_date)]));
    setPdfUrl(previewPdf(doc)); setPdfFilename('saldo-member.pdf');
  };
  const exportCommission = async () => {
    const doc = await generateReport(`Komisi Pelatih (${formatDate(startDate)} - ${formatDate(endDate)})`,
      ['Tanggal', 'Pelatih', 'Member', 'Harga Paket', '%', 'Komisi'],
      commissions.map(c => [formatDate(c.date), coachMap[c.coach_id] || '-', memberMap[c.member_id] || '-', formatCurrency(c.package_price), `${c.commission_percentage}%`, formatCurrency(c.commission_amount)]),
      [{ label: 'Total', value: formatCurrency(commissions.reduce((s, c) => s + c.commission_amount, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('komisi.pdf');
  };
  const exportProfit = async () => {
    const tp = payments.reduce((s, r) => s + r.amount, 0), ts = sales.reduce((s, r) => s + r.total, 0), tc = commissions.reduce((s, r) => s + r.commission_amount, 0);
    const doc = await generateReport(`Profit (${formatDate(startDate)} - ${formatDate(endDate)})`,
      ['Keterangan', 'Jumlah'],
      [['Pembayaran Member', formatCurrency(tp)], ['Penjualan Produk', formatCurrency(ts)], ['Komisi Pelatih', `(${formatCurrency(tc)})`]],
      [{ label: 'Gross', value: formatCurrency(tp + ts) }, { label: 'Biaya', value: formatCurrency(tc) }, { label: 'Net Profit', value: formatCurrency((tp + ts) - tc) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('profit.pdf');
  };

  // Excel exports (premium) — rows rapi sesuai kolom tabel masing-masing tab
  const excelSales = () => exportToExcel(
    sales.map(s => ({
      Tanggal: formatDate(s.transaction_date),
      Pelanggan: s.customer_name || '-',
      Items: s.items.map((i: any) => `${i.product_name} x${i.quantity}`).join(', '),
      Total: s.total,
    })),
    `penjualan-${startDate}_${endDate}`, 'Penjualan');
  const excelPayments = () => exportToExcel(
    payments.map(p => ({
      Tanggal: formatDate(p.payment_date),
      Member: memberMap[p.member_id] || '-',
      Paket: packageMap[p.package_id] || '-',
      Jumlah: p.amount,
      Metode: p.payment_method,
    })),
    `pembayaran-${startDate}_${endDate}`, 'Pembayaran');
  const excelBalance = () => exportToExcel(
    allMemberPackages.map(p => ({
      Member: memberMap[p.member_id] || '-',
      Paket: packageMap[p.package_id] || '-',
      'Sisa Sesi': p.remaining_sessions,
      'Total Sesi': p.total_sessions,
      Status: p.status,
      Expired: formatDate(p.expired_date),
    })),
    'saldo-member', 'Saldo Member');
  const excelCommission = () => exportToExcel(
    commissions.map(c => ({
      Tanggal: formatDate(c.date),
      Pelatih: coachMap[c.coach_id] || '-',
      Member: memberMap[c.member_id] || '-',
      'Harga Paket': c.package_price,
      '%': c.commission_percentage,
      Komisi: c.commission_amount,
    })),
    `komisi-${startDate}_${endDate}`, 'Komisi');
  const excelProfit = () => {
    const tp = payments.reduce((s, r) => s + r.amount, 0), ts = sales.reduce((s, r) => s + r.total, 0), tc = commissions.reduce((s, r) => s + r.commission_amount, 0);
    exportToExcel([
      { Keterangan: 'Pembayaran Member', Jumlah: tp },
      { Keterangan: 'Penjualan Produk', Jumlah: ts },
      { Keterangan: 'Komisi Pelatih', Jumlah: -tc },
      { Keterangan: 'Gross', Jumlah: tp + ts },
      { Keterangan: 'Net Profit', Jumlah: (tp + ts) - tc },
    ], `profit-${startDate}_${endDate}`, 'Profit');
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      {/* Tab selector — horizontal scroll on mobile, grid on desktop */}
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        <div className="inline-flex lg:grid lg:grid-cols-6 gap-2 min-w-max lg:min-w-0 lg:w-full">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20'
                  : 'bg-white border border-zen-ink/5 text-zen-ink/50 hover:text-zen-ink hover:border-zen-ink/10'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date filter */}
      {needsDateFilter && (
        <DateFilterBar preset={preset} startDate={startDate} endDate={endDate} onChange={handlePresetChange} />
      )}

      {/* Content */}
      {activeTab === 'profit'         && <ProfitReport payments={payments} sales={sales} commissions={commissions} isPro={isPro} onExport={exportProfit} onExportExcel={excelProfit} />}
      {activeTab === 'sales'          && <SalesReport sales={sales} isPro={isPro} onExport={exportSales} onExportExcel={excelSales} />}
      {activeTab === 'payments'       && <PaymentsReport payments={payments} memberMap={memberMap} isPro={isPro} onExport={exportPayments} onExportExcel={excelPayments} />}
      {activeTab === 'member_balance' && <MemberBalanceReport allMemberPackages={allMemberPackages} memberMap={memberMap} packageMap={packageMap} isPro={isPro} onExport={exportBalance} onExportExcel={excelBalance} />}
      {activeTab === 'member_detail'  && <MemberDetailReport members={members} bookings={bookings} memberPackages={memberPackages} memberPayments={memberPayments} packageMap={packageMap} selectedMember={selectedMember} onSelect={setSelectedMember} />}
      {activeTab === 'commission'     && <CommissionReport commissions={commissions} coaches={coaches} coachMap={coachMap} memberMap={memberMap} selectedCoach={selectedCoach} onSelect={setSelectedCoach} isPro={isPro} onExport={exportCommission} onExportExcel={excelCommission} />}

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl('')} pdfUrl={pdfUrl} filename={pdfFilename} />
    </div>
  );
}
