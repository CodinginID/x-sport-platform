import { useState, useEffect } from "react";
import { useMembers, usePackages, useMemberPayments, useMemberPaymentMutation } from "@/hooks";
import { useUnpaidBookings } from "@/hooks/usePayments";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { Button, Modal, Input, Select } from "@/components/ui";
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

export default function MemberPaymentPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(today);

  const { data: payments = [] } = useMemberPayments({ startDate, endDate });
  const { data: members = [] } = useMembers();
  const { data: packages = [] } = usePackages();
  const mutation = useMemberPaymentMutation();
  const { printPayment } = usePrintReceipt();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", package_id: "", payment_method: "cash" as "cash" | "transfer" | "qris", notes: "" });
  const [bookingId, setBookingId] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState("");

  // Fetch unpaid bookings when member is selected
  const { data: unpaidBookings = [], isLoading: bookingLoading } = useUnpaidBookings(form.member_id);

  // Auto-fill package dari booking terbaru yang belum dibayar
  useEffect(() => {
    if (!form.member_id) { setBookingId(undefined); return; }
    const latest = unpaidBookings[0];
    if (latest) {
      setForm(f => ({ ...f, package_id: latest.package_id }));
      setBookingId(latest.booking_id);
    } else {
      setForm(f => ({ ...f, package_id: "" }));
      setBookingId(undefined);
    }
  }, [form.member_id, unpaidBookings]);

  const selectedPkg = packages.find(p => p.package_id === form.package_id);
  const amount = selectedPkg?.package_price ?? 0;
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

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
    try {
      const saved = await mutation.mutateAsync({
        payment_date: today,
        member_id: form.member_id,
        package_id: form.package_id,
        amount,
        payment_method: form.payment_method,
        notes: form.notes,
        booking_id: bookingId,
      });
      setModalOpen(false);
      setForm({ member_id: "", package_id: "", payment_method: "cash", notes: "" });
      setBookingId(undefined);
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

      {/* List */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
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
      </div>

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('payments.add_payment')}>
        <div className="space-y-4">

          {/* Step 1: Pilih member */}
          <Select
            label="Member"
            options={[{ value: "", label: t('payments.select_member') }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]}
            value={form.member_id}
            onChange={e => setForm({ ...form, member_id: e.target.value, package_id: "" })}
          />

          {/* Step 2: Loading skeleton */}
          {form.member_id && bookingLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-zen-ink/6 rounded-2xl" />
              <div className="space-y-1.5">
                <div className="h-2 bg-zen-ink/8 rounded-full w-16" />
                <div className="h-11 bg-zen-ink/6 rounded-2xl" />
              </div>
            </div>
          )}

          {/* Step 2a: Booking ditemukan → lanjut ke form bayar */}
          {form.member_id && !bookingLoading && bookingId && unpaidBookings[0] && (
            <>
              {/* Booking card */}
              <div className="bg-zen-brand/8 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zen-brand/15 flex items-center justify-center shrink-0">
                  <CalendarCheck size={15} className="text-zen-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zen-brand">Booking aktif ditemukan</p>
                  <p className="text-[11px] text-zen-ink/50 mt-0.5 truncate">
                    {packageMap[unpaidBookings[0].package_id] || '—'} · {formatDate(unpaidBookings[0].booking_date)}
                    {unpaidBookings[0].booking_time ? ` · ${unpaidBookings[0].booking_time.slice(0, 5)}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-zen-brand shrink-0">{formatCurrency(unpaidBookings[0].package_price ?? amount)}</span>
              </div>

              {/* Nominal */}
              <Input label={t('payments.amount')} value={formatCurrency(amount)} disabled />

              {/* Metode bayar */}
              <Select
                label={t('payments.method')}
                options={[{ value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "qris", label: "QRIS" }]}
                value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value as any })}
              />

              {/* Catatan */}
              <Input label={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSubmit}>{t('common.save')}</Button>
              </div>
            </>
          )}

          {/* Step 2b: Tidak ada booking → blokir, arahkan buat booking dulu */}
          {form.member_id && !bookingLoading && !bookingId && (
            <>
              <div className="bg-amber-50 rounded-2xl px-4 py-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarCheck size={15} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700">Belum ada booking aktif</p>
                  <p className="text-[11px] text-amber-600/70 mt-0.5 leading-relaxed">
                    Member ini belum memiliki booking yang menunggu pembayaran. Buat booking sesi terlebih dahulu, kemudian lakukan pembayaran di sini.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Tutup</Button>
              </div>
            </>
          )}

          {/* Placeholder saat belum pilih member */}
          {!form.member_id && (
            <div className="flex flex-col items-center justify-center py-6 text-zen-ink/20 gap-2">
              <CalendarCheck size={28} />
              <p className="text-xs text-center">Pilih member untuk melihat<br />booking yang perlu dibayar</p>
            </div>
          )}

        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-pembayaran.pdf" />
    </div>
  );
}
