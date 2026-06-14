import { useState } from 'react';
import { Calendar, Plus, CalendarX, Sparkles } from 'lucide-react';
import { ListSkeleton } from '@/components/Skeleton';
import { useTrainingSessions, useSessionCounts, useCoaches } from '@/hooks';
import { FeatureGate } from '@/components/FeatureGate';
import { CreateSessionModal } from './CreateSessionModal';
import { SessionDetailSheet } from './SessionDetailSheet';
import { ScheduleDefault, SchedulePremium } from './ScheduleViews';
import type { TrainingSession } from '@/types';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function BookingsPage() {
  const [start, setStart] = useState(todayLocal());
  const [end, setEnd] = useState(todayLocal());
  const [catFilter, setCatFilter] = useState<'' | 'reguler' | 'pribadi'>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TrainingSession | null>(null);

  const { data: allSessions = [], isLoading } = useTrainingSessions(start, end);
  const sessions = catFilter ? allSessions.filter(s => s.session_category === catFilter) : allSessions;
  const { data: coaches = [] } = useCoaches();
  const counts = useSessionCounts(sessions.map(s => s.training_session_id));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Jadwal Sesi</h1>
          <FeatureGate feature="premium_booking">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zen-brand/10 text-zen-brand">
              <Sparkles size={11} /> Premium
            </span>
          </FeatureGate>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zen-brand text-white text-sm font-bold">
          <Plus size={15} /> Buat Sesi
        </button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <input type="date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)}
            aria-label="Dari tanggal"
            className="pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand" />
        </div>
        <span className="text-xs text-zen-ink/40 font-medium">s/d</span>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)}
            aria-label="Sampai tanggal"
            className="pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand" />
        </div>
        <div className="flex gap-1.5">
          {([['', 'Semua'], ['reguler', 'Reguler'], ['pribadi', 'Private']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setCatFilter(val)}
              className={`px-3 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${catFilter === val ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <ListSkeleton rows={5} /> : sessions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zen-ink/5 flex flex-col items-center justify-center py-14 text-zen-ink/30">
          <CalendarX size={32} className="mb-3" />
          <p className="text-sm">Belum ada sesi pada periode ini</p>
        </div>
      ) : (
        <FeatureGate
          feature="premium_booking"
          fallback={<ScheduleDefault sessions={sessions} counts={counts} coachMap={coachMap} onOpen={setDetail} />}
        >
          <SchedulePremium sessions={sessions} counts={counts} coachMap={coachMap} onOpen={setDetail} />
        </FeatureGate>
      )}

      <CreateSessionModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailSheet session={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
