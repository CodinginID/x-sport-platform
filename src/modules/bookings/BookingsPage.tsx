import { useState } from 'react';
import { Calendar, Plus, CalendarX, Sparkles } from 'lucide-react';
import { ListSkeleton } from '@/components/Skeleton';
import { formatDate } from '@/utils';
import { useTrainingSessions, useSessionCounts, useCoaches, slotInfo } from '@/hooks';
import { FeatureGate } from '@/components/FeatureGate';
import { CreateSessionModal } from './CreateSessionModal';
import { SessionDetailSheet } from './SessionDetailSheet';
import type { TrainingSession } from '@/types';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function BookingsPage() {
  const [start, setStart] = useState(todayLocal());
  const [end, setEnd] = useState(todayLocal());
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TrainingSession | null>(null);

  const { data: sessions = [], isLoading } = useTrainingSessions(start, end);
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
      </div>

      {isLoading ? <ListSkeleton rows={5} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <CalendarX size={32} className="mb-3" />
              <p className="text-sm">Belum ada sesi pada periode ini</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {sessions.map(s => {
                const slot = slotInfo(counts[s.training_session_id] ?? 0, s.capacity);
                return (
                  <div key={s.training_session_id} onClick={() => setDetail(s)}
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zen-bg transition-colors">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-bold text-zen-ink leading-tight">{s.session_time || 'Sesi'}</p>
                      <p className="text-[11px] text-zen-ink/40">{formatDate(s.session_date)}</p>
                    </div>
                    <div className="flex-1 min-w-0 text-xs text-zen-ink/50 truncate">
                      {s.coach_id ? `Coach ${coachMap[s.coach_id] ?? '—'}` : <span className="text-amber-600">Belum ada coach</span>}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${slot.isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {slot.isFull ? 'PENUH' : `${slot.filled}/${slot.capacity}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CreateSessionModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailSheet session={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
