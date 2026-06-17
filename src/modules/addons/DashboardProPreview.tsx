import { DashboardPro } from '@/modules/dashboard/DashboardPro';
import type { DashboardProData } from '@/hooks/useDashboardPro';

// Data contoh untuk preview — bukan data nyata, hanya untuk menunjukkan visualisasi.
function buildSampleDaily() {
  const today = new Date();
  const revenueDaily = [];
  const attendanceDaily = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const wave = Math.sin(i / 3) * 0.5 + 0.5; // 0..1 halus
    revenueDaily.push({ date: iso, label, value: Math.round((400_000 + wave * 900_000) / 1000) * 1000 });
    attendanceDaily.push({ date: iso, label, value: Math.round(4 + wave * 12) });
  }
  return { revenueDaily, attendanceDaily };
}

const { revenueDaily, attendanceDaily } = buildSampleDaily();

const SAMPLE: DashboardProData = {
  revenueThisMonth: 14_500_000,
  attendanceThisMonth: 186,
  activeMembers: 64,
  avgOccupancy: 72,
  revenueDaily,
  attendanceDaily,
  busiestHours: [
    { hour: '07:00', count: 12 },
    { hour: '08:00', count: 28 },
    { hour: '09:00', count: 19 },
    { hour: '16:00', count: 24 },
    { hour: '17:00', count: 31 },
    { hour: '18:00', count: 22 },
  ],
  topPackages: [
    { name: 'Reguler 8x', count: 42 },
    { name: 'Private 4x', count: 28 },
    { name: 'Drop-in', count: 17 },
  ],
  topCoaches: [
    { name: 'Sinta', count: 39 },
    { name: 'Budi', count: 31 },
    { name: 'Agnes', count: 24 },
  ],
};

/** Preview Dashboard Pro dengan data contoh (read-only). */
export function DashboardProPreview() {
  return (
    <div className="pointer-events-none select-none">
      <DashboardPro data={SAMPLE} />
    </div>
  );
}
