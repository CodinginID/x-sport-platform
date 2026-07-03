import { useState } from 'react';
import { DetailSheet, DetailSection } from '@/components/DetailSheet';
import { PrintPreview } from '@/components/PrintPreview';
import { useCoachCommissions, useCoachPayouts, useCreateCoachPayout, useMembers } from '@/hooks';
import { fetchPayoutCommissions } from '@/hooks/usePayments';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useToastStore } from '@/stores/toast';
import { formatCurrency, formatDate } from '@/utils';
import type { CoachCommission, CoachPayout } from '@/types';
import { Calendar, Printer, Wallet } from 'lucide-react';

interface Props {
  coachId: string;
  coachName: string;
  isAdmin: boolean;
  onClose: () => void;
}

/** Kelompokkan komisi per kelas/paket untuk breakdown slip & tampilan. */
function breakdownByClass(rows: CoachCommission[]) {
  const map = new Map<string, { label: string; count: number; amount: number }>();
  for (const c of rows) {
    const label = c.bookings?.packages?.package_name || 'Lainnya';
    const cur = map.get(label) ?? { label, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += c.commission_amount;
    map.set(label, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function monthRange() {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

export function CoachPayoutSheet({ coachId, coachName, isAdmin, onClose }: Props) {
  const [startDate, setStartDate] = useState(() => monthRange().start);
  const [endDate, setEndDate] = useState(() => monthRange().end);
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const { data: commissions = [], isLoading } = useCoachCommissions({ coach_id: coachId, startDate, endDate, unpaidOnly });
  const { data: payouts = [] } = useCoachPayouts(coachId);
  const { data: members = [] } = useMembers();
  const createPayout = useCreateCoachPayout();
  const { printPayout } = usePrintReceipt();
  const addToast = useToastStore(s => s.addToast);

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const total = commissions.reduce((s, c) => s + c.commission_amount, 0);
  const items = breakdownByClass(commissions);
  const unpaidCount = commissions.filter(c => !c.payout_id).length;

  const printSlip = async (payout: CoachPayout, rows: CoachCommission[]) => {
    const { printed, fallbackUrl } = await printPayout(payout, breakdownByClass(rows));
    if (fallbackUrl) setPdfUrl(fallbackUrl);
    return printed;
  };

  const handlePay = async () => {
    setConfirming(false);
    try {
      const res = await createPayout.mutateAsync({ coach_id: coachId, period_start: startDate, period_end: endDate });
      const payout: CoachPayout = {
        payout_id: res.payout_id,
        coach_id: coachId,
        coach_name: coachName,
        period_start: startDate,
        period_end: endDate,
        total_amount: res.total_amount,
        session_count: res.session_count,
        notes: '',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const printed = await printSlip(payout, commissions.filter(c => !c.payout_id));
      addToast(`Slip komisi dibuat${printed ? ' & dicetak' : ''}`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Gagal membuat slip komisi.', 'error');
    }
  };

  const handleReprint = async (payout: CoachPayout) => {
    try {
      const rows = await fetchPayoutCommissions(payout.payout_id);
      await printSlip(payout, rows);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Gagal mencetak ulang slip.', 'error');
    }
  };

  return (
    <DetailSheet open onClose={onClose} title={coachName} subtitle="Rekap komisi & slip gaji">
      {/* Rentang tanggal */}
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

      <label className="flex items-center gap-2 text-xs text-zen-ink/60">
        <input type="checkbox" checked={unpaidOnly} onChange={e => setUnpaidOnly(e.target.checked)}
          className="rounded border-zen-ink/20 text-zen-brand focus:ring-zen-brand/20" />
        Belum dibayar saja
      </label>

      {/* Total */}
      <div className="bg-zen-brand rounded-3xl p-5 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">
          {unpaidOnly ? 'Komisi Belum Dibayar' : 'Total Komisi Periode Ini'}
        </p>
        <p className="text-3xl font-bold tracking-tight">{formatCurrency(total)}</p>
        <p className="text-xs text-white/50 mt-1">{commissions.length} sesi</p>
      </div>

      {/* Breakdown per kelas */}
      {items.length > 0 && (
        <DetailSection title="Per Kelas">
          {items.map(it => (
            <div key={it.label} className="flex items-center justify-between gap-3 py-2.5 border-b border-zen-ink/5 last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{it.label}</p>
                <p className="text-[10px] text-zen-ink/40">{it.count} sesi</p>
              </div>
              <span className="text-xs font-bold text-zen-brand shrink-0">{formatCurrency(it.amount)}</span>
            </div>
          ))}
        </DetailSection>
      )}

      {/* Daftar sesi */}
      <DetailSection title="Daftar Sesi">
        {isLoading ? (
          <p className="py-4 text-xs text-zen-ink/40 text-center">Memuat…</p>
        ) : commissions.length === 0 ? (
          <p className="py-4 text-xs text-zen-ink/40 text-center">Tidak ada komisi pada rentang ini.</p>
        ) : commissions.map(c => (
          <div key={c.commission_id} className="flex items-center justify-between gap-3 py-2.5 border-b border-zen-ink/5 last:border-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{c.bookings?.packages?.package_name || 'Lainnya'}</p>
              <p className="text-[10px] text-zen-ink/40 truncate">
                {memberMap[c.member_id] || '—'} · {formatDate(c.date)}{c.bookings?.booking_time ? ` ${c.bookings.booking_time.slice(0, 5)}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-zen-brand">{formatCurrency(c.commission_amount)}</p>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.payout_id ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {c.payout_id ? 'Lunas' : 'Belum dibayar'}
              </span>
            </div>
          </div>
        ))}
      </DetailSection>

      {/* Bayar & cetak slip (owner) */}
      {isAdmin && (
        confirming ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-amber-800">
              Tandai <b>{unpaidCount} sesi</b> ({formatCurrency(commissions.filter(c => !c.payout_id).reduce((s, c) => s + c.commission_amount, 0))})
              periode {formatDate(startDate)} – {formatDate(endDate)} sebagai <b>sudah dibayar</b> dan cetak slip? Tindakan ini tidak bisa dibatalkan dari aplikasi.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 bg-white border border-zen-ink/10 text-sm font-bold rounded-2xl">Batal</button>
              <button onClick={handlePay} disabled={createPayout.isPending}
                className="flex-1 py-2.5 bg-zen-brand text-white text-sm font-bold rounded-2xl disabled:opacity-50">
                {createPayout.isPending ? 'Memproses…' : 'Ya, Bayar'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} disabled={unpaidCount === 0}
            className="w-full py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40">
            <Wallet size={15} /> Bayar & Cetak Slip
          </button>
        )
      )}

      {/* Riwayat slip */}
      {payouts.length > 0 && (
        <DetailSection title="Riwayat Slip">
          {payouts.map(p => (
            <div key={p.payout_id} className="flex items-center justify-between gap-3 py-2.5 border-b border-zen-ink/5 last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{formatCurrency(p.total_amount)} · {p.session_count} sesi</p>
                <p className="text-[10px] text-zen-ink/40 truncate">
                  {formatDate(p.period_start)} – {formatDate(p.period_end)} · dibayar {formatDate(p.paid_at)}
                </p>
              </div>
              <button onClick={() => handleReprint(p)}
                className="w-8 h-8 rounded-xl bg-zen-brand/10 text-zen-brand flex items-center justify-center shrink-0"
                title="Cetak ulang slip">
                <Printer size={14} />
              </button>
            </div>
          ))}
        </DetailSection>
      )}

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl('')} pdfUrl={pdfUrl} filename="slip-komisi.pdf" />
    </DetailSheet>
  );
}
