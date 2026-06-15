import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/utils';

const BRAND = '#16a34a';
const RED = '#ef4444';

// ─── Helpers ────────────────────────────────────────────────────────────────

function dayLabel(date: string) {
  // YYYY-MM-DD → DD/MM
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Agregasi nilai per tanggal, urut menaik. */
function seriesByDate<T>(rows: T[], getDate: (r: T) => string, getVal: (r: T) => number) {
  const byDate: Record<string, number> = {};
  for (const r of rows) {
    const d = getDate(r);
    if (!d) continue;
    byDate[d] = (byDate[d] || 0) + getVal(r);
  }
  return Object.keys(byDate).sort().map(d => ({ label: dayLabel(d), value: byDate[d] }));
}

// ─── Shells ─────────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">{title}</p>
      <div className="h-56 -ml-2">{children}</div>
    </div>
  );
}

function currencyTooltipStyle() {
  return { borderRadius: 16, border: '1px solid #00000010', fontSize: 12 } as const;
}

function TrendArea({ data, gradId }: { data: { label: string; value: number }[]; gradId: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={currencyTooltipStyle()} />
        <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Per-tab charts (premium) ─────────────────────────────────────────────────

export function SalesChart({ sales }: { sales: any[] }) {
  const data = seriesByDate(sales, s => s.transaction_date, s => s.total);
  if (data.length === 0) return null;
  return (
    <ChartCard title="Tren Penjualan Harian">
      <TrendArea data={data} gradId="salesGrad" />
    </ChartCard>
  );
}

export function PaymentsChart({ payments }: { payments: any[] }) {
  const data = seriesByDate(payments, p => p.payment_date, p => p.amount);
  if (data.length === 0) return null;
  return (
    <ChartCard title="Tren Penerimaan Harian">
      <TrendArea data={data} gradId="paymentsGrad" />
    </ChartCard>
  );
}

export function CommissionChart({ commissions }: { commissions: any[] }) {
  const data = seriesByDate(commissions, c => c.date, c => c.commission_amount);
  if (data.length === 0) return null;
  return (
    <ChartCard title="Tren Komisi Harian">
      <TrendArea data={data} gradId="commissionGrad" />
    </ChartCard>
  );
}

export function ProfitChart({ payments, sales, commissions }: { payments: any[]; sales: any[]; commissions: any[] }) {
  const tp = payments.reduce((s: number, r: any) => s + r.amount, 0);
  const ts = sales.reduce((s: number, r: any) => s + r.total, 0);
  const tc = commissions.reduce((s: number, r: any) => s + r.commission_amount, 0);
  const data = [
    { label: 'Pembayaran', value: tp },
    { label: 'Penjualan', value: ts },
    { label: 'Komisi', value: tc },
    { label: 'Net Profit', value: tp + ts - tc },
  ];
  if (tp + ts + tc === 0) return null;
  return (
    <ChartCard title="Komposisi Profit">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48}
            tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={currencyTooltipStyle()} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}
            // komisi = biaya → merah; sisanya brand
            fill={BRAND}
            shape={(props: any) => {
              const isCost = props.payload?.label === 'Komisi';
              const { x, y, width, height } = props;
              return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={isCost ? RED : BRAND} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
