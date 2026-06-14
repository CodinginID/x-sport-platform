import { Users, CheckCircle2 } from 'lucide-react';
import { slotInfo } from '@/hooks';
import { formatDate } from '@/utils';
import type { TrainingSession } from '@/types';

export interface ScheduleViewProps {
  sessions: TrainingSession[];
  counts: Record<string, number>;
  coachMap: Record<string, string>;
  onOpen: (s: TrainingSession) => void;
}

/** Kelompokkan sesi per tanggal (sesi sudah terurut tanggal lalu jam dari query). */
function groupByDate(sessions: TrainingSession[]): [string, TrainingSession[]][] {
  const map = new Map<string, TrainingSession[]>();
  for (const s of sessions) {
    const arr = map.get(s.session_date) ?? [];
    arr.push(s);
    map.set(s.session_date, arr);
  }
  return [...map.entries()];
}

function CategoryBadge({ category }: { category: TrainingSession['session_category'] }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${category === 'pribadi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
      {category === 'pribadi' ? 'Private' : 'Reguler'}
    </span>
  );
}

// ─── Default: list dengan pemisah per tanggal ─────────────────────────────────
export function ScheduleDefault({ sessions, counts, coachMap, onOpen }: ScheduleViewProps) {
  const groups = groupByDate(sessions);
  return (
    <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
      {groups.map(([date, daySessions]) => (
        <div key={date}>
          <div className="px-5 py-2.5 bg-zen-bg/60 border-y border-zen-ink/5 first:border-t-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zen-ink/50">{formatDate(date)}</p>
          </div>
          <div className="divide-y divide-zen-ink/5">
            {daySessions.map(s => {
              const slot = slotInfo(counts[s.training_session_id] ?? 0, s.capacity);
              return (
                <div key={s.training_session_id} onClick={() => onOpen(s)}
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zen-bg transition-colors">
                  <div className="w-14 shrink-0 text-sm font-bold text-zen-ink">{s.session_time || 'Sesi'}</div>
                  <div className="flex-1 min-w-0">
                    <CategoryBadge category={s.session_category} />
                    <p className="text-xs text-zen-ink/50 truncate mt-1">
                      {s.coach_id ? `Coach ${coachMap[s.coach_id] ?? '—'}` : <span className="text-amber-600">Belum ada coach</span>}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${slot.isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {slot.isFull ? 'PENUH' : `${slot.filled}/${slot.capacity}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Premium: kartu per tanggal + ringkasan slot kosong ───────────────────────
export function SchedulePremium({ sessions, counts, coachMap, onOpen }: ScheduleViewProps) {
  const groups = groupByDate(sessions);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map(([date, daySessions]) => {
        const withSlot = daySessions.filter(s => (counts[s.training_session_id] ?? 0) < s.capacity);
        return (
          <div key={date} className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
            {/* Header tanggal + ringkasan */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-zen-brand/10 to-zen-brand/5 border-b border-zen-ink/5">
              <p className="text-sm font-bold text-zen-ink">{formatDate(date)}</p>
              <p className="text-[11px] text-zen-ink/50 mt-0.5">
                {daySessions.length} sesi · <span className={withSlot.length ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{withSlot.length} ada slot kosong</span>
              </p>
            </div>
            {/* Sesi */}
            <div className="p-3 space-y-2">
              {daySessions.map(s => {
                const slot = slotInfo(counts[s.training_session_id] ?? 0, s.capacity);
                return (
                  <button key={s.training_session_id} onClick={() => onOpen(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all border ${slot.isFull ? 'bg-zen-bg/50 border-transparent opacity-60' : 'bg-green-50/60 border-green-100 hover:border-green-300'}`}>
                    <div className="w-12 shrink-0 text-sm font-bold text-zen-ink">{s.session_time}</div>
                    <div className="flex-1 min-w-0">
                      <CategoryBadge category={s.session_category} />
                      <p className="text-[11px] text-zen-ink/50 truncate mt-0.5">
                        {s.coach_id ? coachMap[s.coach_id] ?? '—' : <span className="text-amber-600">Belum ada coach</span>}
                      </p>
                    </div>
                    {slot.isFull ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-500"><Users size={12} /> Penuh</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-600">
                        <CheckCircle2 size={12} /> {slot.capacity - slot.filled} slot
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
