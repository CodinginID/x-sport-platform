import { useMemo, useState } from 'react';
import { Users, CheckCircle2, Filter } from 'lucide-react';
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

/** Okupansi harian: total terisi vs total kapasitas + warna "heatmap". */
function dayOccupancy(daySessions: TrainingSession[], counts: Record<string, number>) {
  let filled = 0;
  let capacity = 0;
  for (const s of daySessions) {
    filled += Math.min(counts[s.training_session_id] ?? 0, s.capacity);
    capacity += s.capacity;
  }
  const ratio = capacity > 0 ? filled / capacity : 0;
  const free = Math.max(0, capacity - filled);
  // <50% hijau, 50–85% kuning, >85% merah
  const heat = ratio > 0.85
    ? { header: 'bg-gradient-to-r from-red-500/15 to-red-500/5', bar: 'bg-red-500', text: 'text-red-600' }
    : ratio >= 0.5
      ? { header: 'bg-gradient-to-r from-amber-400/20 to-amber-400/5', bar: 'bg-amber-500', text: 'text-amber-600' }
      : { header: 'bg-gradient-to-r from-green-500/15 to-green-500/5', bar: 'bg-green-500', text: 'text-green-600' };
  return { filled, capacity, free, ratio, ...heat };
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
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Saat toggle aktif, sembunyikan sesi yang penuh; tanggal tanpa sisa sesi hilang.
  const groups = useMemo(() => {
    const filtered = onlyAvailable
      ? sessions.filter(s => (counts[s.training_session_id] ?? 0) < s.capacity)
      : sessions;
    return groupByDate(filtered);
  }, [sessions, counts, onlyAvailable]);

  return (
    <div className="space-y-3">
      {/* Toggle filter — hanya tampil di view premium */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOnlyAvailable(v => !v)}
          aria-pressed={onlyAvailable}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all border ${onlyAvailable ? 'bg-green-600 text-white border-green-600' : 'bg-white border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}
        >
          <Filter size={12} /> Hanya ada slot kosong
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zen-ink/5 py-10 text-center text-sm text-zen-ink/40">
          Tidak ada sesi dengan slot kosong
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2">
      {groups.map(([date, daySessions]) => {
        const withSlot = daySessions.filter(s => (counts[s.training_session_id] ?? 0) < s.capacity);
        const occ = dayOccupancy(daySessions, counts);
        return (
          <div key={date} className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
            {/* Header tanggal + okupansi heatmap */}
            <div className={`px-5 py-3.5 border-b border-zen-ink/5 ${occ.header}`}>
              <p className="text-sm font-bold text-zen-ink">{formatDate(date)}</p>
              <p className="text-[11px] text-zen-ink/50 mt-0.5">
                {daySessions.length} sesi · <span className={withSlot.length ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{withSlot.length} ada slot kosong</span>
              </p>
              {/* Bar okupansi harian */}
              <div className="mt-2 h-1.5 rounded-full bg-zen-ink/10 overflow-hidden">
                <div className={`h-full rounded-full ${occ.bar}`} style={{ width: `${Math.round(occ.ratio * 100)}%` }} />
              </div>
              <p className={`text-[10px] font-bold mt-1 ${occ.text}`}>
                {occ.free} slot kosong dari {occ.capacity} total
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
      )}
    </div>
  );
}
