import { useState } from 'react';
import { Calendar, Plus, CalendarX } from 'lucide-react';
import { ListSkeleton } from '@/components/Skeleton';
import { useTrainingSessions, useSessionCounts, usePackages, useCoaches } from '@/hooks';
import { CreateSessionModal } from './CreateSessionModal';
import { SessionDetailSheet } from './SessionDetailSheet';
import type { TrainingSession } from '@/types';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function BookingsPage() {
  const [date, setDate] = useState(todayLocal());
  const [packageFilter, setPackageFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TrainingSession | null>(null);

  const { data: sessions = [], isLoading } = useTrainingSessions(date);
  const { data: packages = [] } = usePackages();
  const { data: coaches = [] } = useCoaches();
  const counts = useSessionCounts(sessions.map(s => s.training_session_id));

  const pkgMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const shown = packageFilter ? sessions.filter(s => s.package_id === packageFilter) : sessions;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jadwal Sesi</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zen-brand text-white text-sm font-bold">
          <Plus size={15} /> Buat Sesi
        </button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand" />
        </div>
        <select value={packageFilter} onChange={e => setPackageFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl">
          <option value="">Semua paket</option>
          {packages.map(p => <option key={p.package_id} value={p.package_id}>{p.package_name}</option>)}
        </select>
      </div>

      {isLoading ? <ListSkeleton rows={5} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <CalendarX size={32} className="mb-3" />
              <p className="text-sm">Belum ada sesi pada tanggal ini</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {shown.map(s => {
                const filled = counts[s.training_session_id] ?? 0;
                const full = filled >= s.capacity;
                return (
                  <div key={s.training_session_id} onClick={() => setDetail(s)}
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zen-bg transition-colors">
                    <div className="w-14 shrink-0 text-sm font-bold text-zen-ink">{s.session_time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{pkgMap[s.package_id] ?? '—'}</p>
                      <p className="text-xs text-zen-ink/40 truncate">Coach {coachMap[s.coach_id] ?? '—'}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${full ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {full ? 'PENUH' : `${filled}/${s.capacity}`}
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
