import { useState, useEffect } from "react";
import { useMembers, usePackages, useMemberPayments, useMemberPackages, usePayPendingPackage } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { Button, Modal, Input, Select, TrendBars } from "@/components/ui";
import { useFeature } from "@/hooks/useFeature";
import { SmartSelect } from "@/components/ui/SmartSelect";
import { ListSkeleton } from "@/components/Skeleton";
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
import { usePrinterStore } from "@/stores/printer";
import { useToastStore } from "@/stores/toast";
import { PrintPreview } from "@/components/PrintPreview";
import { Calendar, Plus, Printer, Receipt, CalendarCheck } from "lucide-react";

type Preset = '7d' | '30d' | 'month' | 'custom';

function getPresetDates(preset: Preset) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (preset === '7d') { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: s.toISOString().split('T')[0], end }; }
  if (preset === '30d') { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: s.toISOString().split('T')[0], end }; }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const METHOD_BADGE: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  qris: 'bg-purple-100 text-purple-700',
};

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', transfer: 'Transfer', qris: 'QRIS' };

export default function MemberPaymentPage() {
  const { t } = useTranslation();
  const isPro = useFeature('pro');
  const today = new Date().toISOString().split("T")[0];
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(today);

  const { data: payments = [], isLoading: paymentsLoading } = useMemberPayments({ startDate, endDate });
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: packages = [] } = usePackages();
  const payMutation = usePayPendingPackage();
  const { printPayment } = usePrintReceipt();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", member_package_id: "", payment_method: "cash" as "cash" | "transfer" | "qris", notes: "" });
  const [pdfUrl, setPdfUrl] = useState("");

  // Paket PENDING (belum bayar) milik member terpilih — pembayaran TIDAK pilih paket dari katalog,
  // hanya menyelesaikan paket yang sudah dibeli member.
  const { data: memberPkgs = [], isLoading: pkgsLoading } = useMemberPackages(form.member_id);
  const pendingPkgs = memberPkgs.filter(mp => mp.status === 'pending');

  const packageMapPrice = Object.fromEntries(packages.map(p => [p.package_id, p.package_price]));
  const selectedMp = pendingPkgs.find(mp => mp.member_package_id === form.member_package_id);
  const amount = selectedMp ? (packageMapPrice[selectedMp.package_id] ?? 0) : 0;
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

  // Pro insight — agregasi dari `payments` yang sudah di-fetch (tanpa query baru).
  const dailyTrend = (() => {
    const byDate: Record<string, number> = {};
    for (const p of payments) byDate[p.payment_date] = (byDate[p.payment_date] || 0) + p.amount;
    return Object.keys(byDate).sort().map(d => ({ label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: byDate[d] }));
  })();
  const methodTotals = (() => {
    const acc: Record<string, number> = {};
    for (const p of payments) acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount;
    return acc;
  })();

  // Auto-pilih paket pending bila hanya ada satu (tanpa pilih manual).
  useEffect(() => {
    if (pendingPkgs.length === 1) setForm(f => (f.member_package_id ? f : { ...f, member_package_id: pendingPkgs[0].member_package_id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPkgs.length, form.member_id]);

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const packageMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') { const d = getPresetDates(p); setStartDate(d.start); setEndDate(d.end); }
  };

  const addToast = useToastStore(s => s.addToast);

  /** Cetak struk pembayaran. Mengembalikan `true` bila tercetak via printer. */
  const printReceipt = async (row: any): Promise<boolean> => {
    const memberName = memberMap[row.member_id] || '-';
    const packageName = packageMap[row.package_id] || '-';
    const { printed, fallbackUrl } = await printPayment({
      paymentId: row.payment_id,
      date: formatDate(row.payment_date),
      memberName,
      packageName,
      method: row.payment_method,
      amount: row.amount,
      notes: row.notes,
      raw: {
        payment_id: row.payment_id,
        payment_date: row.payment_date,
        member_name: memberName,
        package_name: packageName,
        amount: row.amount,
        payment_method: row.payment_method,
        notes: row.notes,
      },
    });
    if (fallbackUrl) setPdfUrl(fallbackUrl);
    return printed;
  };

  const handleSubmit = async () => {
    if (!selectedMp) return;
    try {
      await payMutation.mutateAsync({
        member_package_id: selectedMp.member_package_id,
        payment_date: today,
        amount,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      const saved = {
        payment_id: crypto.randomUUID(),
        payment_date: today,
        member_id: form.member_id,
        package_id: selectedMp.package_id,
        amount,
        payment_method: form.payment_method,
        notes: form.notes,
      };
      setModalOpen(false);
      setForm({ member_id: "", member_package_id: "", payment_method: "cash", notes: "" });
      let note = '';
      if (usePrinterStore.getState().autoPrint && (await printReceipt(saved))) note = ' & struk dicetak';
      addToast(`Pembayaran berhasil disimpan${note}`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      addToast(/fetch|network|koneksi/i.test(msg)
        ? 'Gagal menyimpan: koneksi internet bermasalah. Coba lagi.'
        : (msg || 'Gagal menyimpan pembayaran.'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('payments.member_title')}</h1>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('payments.add_payment')}</span>
        </Button>
      </div>

      {/* Hero total */}
      <div className="bg-zen-brand rounded-3xl p-6 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">Total Penerimaan</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalIncome)}</p>
        <p className="text-xs text-white/50 mt-2">{payments.length} pembayaran dalam periode ini</p>
      </div>

      {/* Date presets */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['7d', '30d', 'month', 'custom'] as Preset[]).map(p => (
            <button key={p} onClick={() => handlePreset(p)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all ${preset === p ? 'bg-zen-brand text-white shadow-sm' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : p === 'month' ? 'Bulan Ini' : 'Custom'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
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
        )}
      </div>

      {/* Pro: insight penerimaan (tren harian + ringkasan per metode) */}
      {isPro && payments.length > 0 && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-4">Tren Penerimaan Harian</p>
            <TrendBars data={dailyTrend} formatValue={formatCurrency} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'transfer', 'qris'] as const).map(m => (
              <div key={m} className="bg-white rounded-3xl p-4 border border-zen-ink/5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${METHOD_BADGE[m]}`}>{METHOD_LABEL[m]}</span>
                <p className="text-base font-bold mt-2 tracking-tight">{formatCurrency(methodTotals[m] || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {paymentsLoading ? <ListSkeleton rows={5} /> : <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
            <Receipt size={32} className="mb-3" />
            <p className="text-sm">{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="divide-y divide-zen-ink/5">
            {payments.map(p => (
              <div key={p.payment_id} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(memberMap[p.member_id] || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{memberMap[p.member_id] || '—'}</p>
                  <p className="text-xs text-zen-ink/40 truncate">{packageMap[p.package_id] || '—'} · {formatDate(p.payment_date)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline ${METHOD_BADGE[p.payment_method] || 'bg-zen-bg text-zen-ink/50'}`}>
                    {p.payment_method.toUpperCase()}
                  </span>
                  <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                  <button
                    onClick={async () => { if (await printReceipt(p)) addToast('Struk dicetak', 'success'); }}
                    className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/30 hover:text-zen-brand transition-colors"
                    title="Cetak struk"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('payments.add_payment')}>
        <div className="space-y-4">

          {/* Step 1: Pilih member */}
          <SmartSelect
            label="Member"
            placeholder={t('payments.select_member')}
            options={members.map(m => ({ value: m.member_id, label: m.full_name }))}
            value={form.member_id}
            loading={membersLoading}
            onChange={v => setForm({ ...form, member_id: v, member_package_id: "" })}
          />

          {/* Step 2: Pilih paket PENDING milik member (sudah dibeli, belum dibayar) */}
          {form.member_id && (
            pkgsLoading ? (
              <div className="h-14 bg-zen-ink/6 rounded-2xl animate-pulse" />
            ) : pendingPkgs.length === 0 ? (
              <div className="bg-amber-50 rounded-2xl px-4 py-4 flex items-start gap-3">
                <CalendarCheck size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700">Tidak ada paket menunggu pembayaran</p>
                  <p className="text-[11px] text-amber-600/70 mt-0.5 leading-relaxed">
                    Member ini belum membeli paket. Buka menu Member → "Beli Paket" terlebih dahulu.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Paket pending — kartu, auto-terpilih bila satu, klik untuk pilih bila banyak */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Paket Menunggu Pembayaran</p>
                  <div className="space-y-2">
                    {pendingPkgs.map(mp => {
                      const sel = form.member_package_id === mp.member_package_id;
                      return (
                        <button key={mp.member_package_id} type="button"
                          onClick={() => setForm({ ...form, member_package_id: mp.member_package_id })}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${sel ? 'bg-zen-brand/8 border-zen-brand' : 'bg-zen-bg border-transparent hover:border-zen-brand/30'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sel ? 'bg-zen-brand text-white' : 'bg-zen-brand/10 text-zen-brand'}`}>
                            <Receipt size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{packageMap[mp.package_id] ?? '—'}</p>
                            <p className="text-[11px] text-zen-ink/40">{mp.total_sessions} sesi</p>
                          </div>
                          <span className="text-sm font-bold text-zen-brand shrink-0">{formatCurrency(packageMapPrice[mp.package_id] ?? 0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedMp && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between px-4 py-3 bg-zen-brand rounded-2xl text-white">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">Total Bayar</span>
                      <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                    </div>
                    <Select
                      label={t('payments.method')}
                      options={[{ value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "qris", label: "QRIS" }]}
                      value={form.payment_method}
                      onChange={e => setForm({ ...form, payment_method: e.target.value as any })}
                    />
                    <Input label={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleSubmit} disabled={!selectedMp || payMutation.isPending}>
                    {payMutation.isPending ? 'Menyimpan...' : t('common.save')}
                  </Button>
                </div>
              </>
            )
          )}

          {/* Placeholder saat belum pilih member */}
          {!form.member_id && (
            <div className="flex flex-col items-center justify-center py-6 text-zen-ink/20 gap-2">
              <CalendarCheck size={28} />
              <p className="text-xs text-center">Pilih member untuk melihat<br />paket yang menunggu pembayaran</p>
            </div>
          )}

        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-pembayaran.pdf" />
    </div>
  );
}
