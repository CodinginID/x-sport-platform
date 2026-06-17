import { SchedulePremium } from '@/modules/bookings/ScheduleViews';
import type { TrainingSession } from '@/types';

// Data contoh untuk preview — bukan data nyata, hanya untuk menunjukkan visualisasi.
const COACHES: Record<string, string> = { c1: 'Budi', c2: 'Sinta', c3: 'Agnes' };

function s(id: string, date: string, time: string, cat: TrainingSession['session_category'], coach: string, cap: number): TrainingSession {
  return {
    training_session_id: id, session_date: date, session_time: time,
    session_category: cat, capacity: cap, coach_id: coach,
    status: 'scheduled', created_at: '', updated_at: '',
  };
}

const SAMPLE_SESSIONS: TrainingSession[] = [
  s('p1', '2026-06-16', '08:00', 'reguler', 'c1', 8),
  s('p2', '2026-06-16', '10:00', 'pribadi', 'c2', 1),
  s('p3', '2026-06-16', '16:00', 'reguler', 'c1', 8),
  s('p4', '2026-06-17', '07:30', 'reguler', 'c3', 6),
  s('p5', '2026-06-17', '17:30', 'pribadi', 'c2', 1),
];

// terisi/kapasitas contoh: ada yang penuh, ada yang masih kosong
const SAMPLE_COUNTS: Record<string, number> = { p1: 5, p2: 1, p3: 8, p4: 2, p5: 0 };

/** Preview tampilan Booking Premium dengan data contoh (read-only). */
export function PremiumBookingPreview() {
  return (
    <div className="pointer-events-none select-none">
      <SchedulePremium sessions={SAMPLE_SESSIONS} counts={SAMPLE_COUNTS} coachMap={COACHES} onOpen={() => {}} />
    </div>
  );
}
