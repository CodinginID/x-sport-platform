import { useState } from 'react';
import { useCoachCommissions, useCoaches, useMembers } from '@/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { Calendar, Award, ChevronRight } from 'lucide-react';

type Preset = '7d' | '30d' | 'month' | 'custom';

function getPresetDates(preset: Preset) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (preset === '7d') { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: s.toISOString().split('T')[0], end }; }
  if (preset === '30d') { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: s.toISOString().split('T')[0], end }; }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function CommissionsPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'owner';

  const [coachFilter, setCoachFilter] = useState('');
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filterCoachId = isAdmin ? coachFilter || undefined : user?.id;
  const { data: commissions = [] } = useCoachCommissions({ coach_id: filterCoachId, startDate, endDate });
  const { data: coaches = [] } = useCoaches();
  const { data: members = [] } = useMembers();

  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const totalKomisi = commissions.reduce((s, c) => s + c.commission_amount, 0);

  const coachTotals = (commissions as any[]).reduce<Record<string, number>>((acc: Record<string, number>, c: any) => {
    acc[c.coach_id] = (acc[c.coach_id] || 0) + c.commission_amount; return acc;
  }, {});

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
          <Select value={coachFilter} onChange={e => setCoachFilter(e.target.value)}
            options={[{ value: '', label: t('reports.select_coach') }, ...coaches.map(c => ({ value: c.coach_id, label: c.full_name }))]}
            label={t('commissions.coach')} />
        )}
      </div>

      {/* Per-coach summary */}
      {isAdmin && Object.keys(coachTotals).length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Per Pelatih</p>
          <div className="divide-y divide-zen-ink/5">
            {Object.entries(coachTotals).map(([cid, amt]) => (
              <div key={cid} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-xl bg-zen-brand/10 text-zen-brand font-bold text-[10px] flex items-center justify-center shrink-0">
                  {initials(coachMap[cid] || '?')}
                </div>
                <p className="flex-1 text-sm font-bold">{coachMap[cid] || '—'}</p>
                <p className="text-sm font-bold text-zen-brand">{formatCurrency(amt as number)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail list */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
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
                  <p className="text-xs text-zen-ink/40 truncate">{memberMap[c.member_id] || '—'} · {formatDate(c.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-zen-brand">{formatCurrency(c.commission_amount)}</p>
                  <p className="text-[10px] text-zen-ink/30">{c.commission_percentage}% dari {formatCurrency(c.package_price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
