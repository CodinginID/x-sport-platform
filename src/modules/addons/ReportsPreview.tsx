import { FileSpreadsheet, Download, Calendar, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const BRAND = '#16a34a';
const BRAND_LIGHT = '#16a34a22';

// Data contoh untuk preview laporan
const SAMPLE_REVENUE_BY_TYPE = [
  { name: 'Member Payment', value: 8_500_000 },
  { name: 'Penjualan Produk', value: 3_200_000 },
  { name: 'Drop-in', value: 1_800_000 },
  { name: 'Private', value: 2_400_000 },
];

const COLORS = [BRAND, '#22c55e', '#86efac', '#15803d'];

const SAMPLE_DAILY_REPORT = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 13 + i);
  const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return {
    date: label,
    income: Math.round((1_200_000 + Math.random() * 800_000) / 50_000) * 50_000,
    bookings: Math.round(5 + Math.random() * 15),
  };
});

const PIE_TOTAL = SAMPLE_REVENUE_BY_TYPE.reduce((s, x) => s + x.value, 0);

function fmt(v: number) {
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/** Preview tampilan Laporan Pro dengan data contoh (read-only). */
export function ReportsPreview() {
  return (
    <div className="pointer-events-none select-none space-y-4">
      {/* Header mockup halaman laporan */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-zen-brand" />
          <p className="text-base font-bold">Laporan</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-zen-brand/10 text-zen-brand text-[10px] font-bold uppercase tracking-widest">
            <Download size={11} /> Export PDF
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest">
            <Download size={11} /> Export Excel
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-zen-ink/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Periode</p>
          <p className="text-xs font-bold text-zen-ink">1–14 Jun 2026</p>
        </div>
        <div className="bg-white rounded-2xl border border-zen-ink/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Total Pemasukan</p>
          <p className="text-sm font-bold text-zen-brand">{fmt(PIE_TOTAL)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zen-ink/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Total Booking</p>
          <p className="text-sm font-bold text-zen-ink">{SAMPLE_DAILY_REPORT.reduce((s, x) => s + x.bookings, 0)} sesi</p>
        </div>
      </div>

      {/* Pie breakdown */}
      <div className="bg-white rounded-2xl border border-zen-ink/5 p-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-3">Pemasukan per Kategori</p>
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SAMPLE_REVENUE_BY_TYPE} cx="50%" cy="50%" innerRadius={24} outerRadius={42}
                  dataKey="value" stroke="none" isAnimationActive={false}>
                  {SAMPLE_REVENUE_BY_TYPE.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {SAMPLE_REVENUE_BY_TYPE.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-zen-ink/60">{item.name}</span>
                </div>
                <span className="font-bold text-zen-ink">{fmt(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-2xl border border-zen-ink/5 p-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-3">Tren Harian 14 Hari</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SAMPLE_DAILY_REPORT} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={2} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={42}
                tickFormatter={(v: number) => `${v / 1_000_000}jt`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l: string) => `Tgl ${l}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #00000010', fontSize: 11 }} />
              <Bar dataKey="income" fill={BRAND} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
        <Calendar size={12} className="text-blue-600 shrink-0" />
        <p className="text-[10px] text-blue-700">Export PDF & Excel siap pakai — satu klik, langsung unduh.</p>
      </div>
    </div>
  );
}
