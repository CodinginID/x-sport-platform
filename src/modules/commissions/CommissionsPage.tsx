import { useState } from 'react';
import { useCoachCommissions, useCoaches, useMembers } from '@/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useFeature } from '@/hooks/useFeature';
import { BarChartH, TrendBars } from '@/components/ui';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { ListSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/utils';
import { Calendar, Award, ChevronRight } from 'lucide-react';
import { CoachPayoutSheet } from './CoachPayoutSheet';

type Preset = '7d' | '30d' | 'month' | 'custom';

function getPresetDates(preset: Preset) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (preset === '7d') { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: s.toISOString().split('T')[0], end }; }
  if (preset === '30d') { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: s.toISOString().split('T')[0], end }; }
  // month — full calendar month, so entries dated later this month are included.
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function CommissionsPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'owner';
  const isPro = useFeature('pro');

  const [coachFilter, setCoachFilter] = useState('');
  const [payoutCoach, setPayoutCoach] = useState<{ id: string; name: string } | null>(null);
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('month').end);

  const filterCoachId = isAdmin ? coachFilter || undefined : user?.id;
  const { data: commissions = [], isLoading: commissionsLoading } = useCoachCommissions({ coach_id: filterCoachId, startDate, endDate });
  const { data: coaches = [], isLoading: coachesLoading } = useCoaches();
  const { data: members = [] } = useMembers();

  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const totalKomisi = commissions.reduce((s, c) => s + c.commission_amount, 0);

  const coachTotals = (commissions as any[]).reduce<Record<string, number>>((acc: Record<string, number>, c: any) => {
    acc[c.coach_id] = (acc[c.coach_id] || 0) + c.commission_amount; return acc;
  }, {});
  // Nominal belum dibayar per coach (payout_id null = belum masuk slip).
  const coachUnpaid = (commissions as any[]).reduce<Record<string, number>>((acc: Record<string, number>, c: any) => {
    if (!c.payout_id) acc[c.coach_id] = (acc[c.coach_id] || 0) + c.commission_amount;
    return acc;
  }, {});

  const coachChartData = Object.entries(coachTotals).map(([cid, amt]) => ({ label: coachMap[cid] || '—', value: amt as number }));
  const trendData = (() => {
    const byDate: Record<string, number> = {};
    for (const c of commissions) byDate[c.date] = (byDate[c.date] || 0) + c.commission_amount;
    return Object.keys(byDate).sort().map(d => ({ label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: byDate[d] }));
  })();

  // Pro insight — agregasi dari commissions yang sudah di-fetch.
  const topCoach = coachChartData.length ? coachChartData.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const avgPerTx = commissions.length ? totalKomisi / commissions.length : 0;
  const busiestDay = trendData.length ? trendData.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') { const d = getPresetDates(p); setStartDate(d.start); setEndDate(d.end); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('commissions.title')}</h1>

      {/* Hero */}
      <div className="bg-zen-brand rounded-3xl p-6 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">{t('commissions.total')}</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalKomisi)}</p>
        <p className="text-xs text-white/50 mt-2">{commissions.length} transaksi</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['7d', '30d', 'month', 'custom'] as Preset[]).map(p => (
            <button key={p} onClick={() => handlePreset(p)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all ${preset === p ? 'bg-zen-brand text-white shadow-sm' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : p === 'month' ? 'Bulan Ini' : 'Custom'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
            </div>
            <span className="text-zen-ink/30">—</span>
            <div className="flex-1 relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
            </div>
          </div>
        )}
        {isAdmin && (
          <SmartSelect value={coachFilter} onChange={v => setCoachFilter(v)}
            placeholder={t('reports.select_coach')}
            options={coaches.map(c => ({ value: c.coach_id, label: c.full_name }))}
            loading={coachesLoading}
            label={t('commissions.coach')} />
        )}
      </div>

      {/* Pro: ringkasan insight komisi */}
      {isPro && commissions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Pelatih Teratas</p>
            <p className="text-sm font-bold mt-1 truncate">{topCoach?.label ?? '—'}</p>
            <p className="text-xs text-zen-brand font-bold">{topCoach ? formatCurrency(topCoach.value) : '—'}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Rata-rata / Transaksi</p>
            <p className="text-sm font-bold mt-1 tracking-tight">{formatCurrency(avgPerTx)}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Hari Terramai</p>
            <p className="text-sm font-bold mt-1">{busiestDay?.label ?? '—'}</p>
            <p className="text-xs text-zen-brand font-bold">{busiestDay ? formatCurrency(busiestDay.value) : '—'}</p>
          </div>
        </div>
      )}

      {/* Rekap per coach (fitur Pro) — klik untuk detail, bayar & cetak slip */}
      {isAdmin && isPro && Object.keys(coachTotals).length > 0 && (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Rekap per Coach</p>
          </div>
          <div className="divide-y divide-zen-ink/5">
            {Object.entries(coachTotals).sort((a, b) => b[1] - a[1]).map(([cid, amt]) => (
              <button key={cid} onClick={() => setPayoutCoach({ id: cid, name: coachMap[cid] || '—' })}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zen-bg transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(coachMap[cid] || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{coachMap[cid] || '—'}</p>
                  {coachUnpaid[cid] ? (
                    <p className="text-xs font-semibold text-amber-600">Belum digaji {formatCurrency(coachUnpaid[cid])}</p>
                  ) : (
                    <p className="text-xs text-green-600 font-semibold">Semua sudah digaji</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-zen-brand">{formatCurrency(amt)}</p>
                </div>
                <ChevronRight size={16} className="text-zen-ink/20 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Komisi per pelatih — bar chart */}
      {isAdmin && coachChartData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Komisi per Pelatih</p>
          <BarChartH data={coachChartData} formatValue={formatCurrency} />
        </div>
      )}

      {/* Tren komisi harian */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Tren Komisi Harian</p>
          <TrendBars data={trendData} formatValue={formatCurrency} />
        </div>
      )}

      {/* Detail list */}
      {commissionsLoading ? <ListSkeleton rows={5} /> : <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Rincian Komisi</p>
        </div>
        {commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
            <Award size={32} className="mb-3" />
            <p className="text-sm">{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="divide-y divide-zen-ink/5">
            {commissions.map(c => (
              <div key={c.commission_id} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(coachMap[c.coach_id] || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{coachMap[c.coach_id] || '—'}</p>
                  <p className="text-xs text-zen-ink/40 truncate">
                    {c.bookings?.packages?.package_name ? `${c.bookings.packages.package_name} · ` : ''}{memberMap[c.member_id] || '—'} · {formatDate(c.date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-zen-brand">{formatCurrency(c.commission_amount)}</p>
                  <p className="text-[10px] text-zen-ink/30">{c.commission_percentage}% dari {formatCurrency(c.package_price)}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.payout_id ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.payout_id ? 'Sudah digaji' : 'Belum digaji'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {payoutCoach && (
        <CoachPayoutSheet coachId={payoutCoach.id} coachName={payoutCoach.name}
          isAdmin={isAdmin} onClose={() => setPayoutCoach(null)} />
      )}
    </div>
  );
}
