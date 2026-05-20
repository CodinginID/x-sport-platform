import { useState } from "react";
import { useMembers, usePackages, useMemberPayments, useMemberPaymentMutation } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { generatePaymentReceipt, previewPdf } from "@/utils/pdf";
import { Button, Modal, Input, Select } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";
import { Calendar, Plus, Printer, Receipt } from "lucide-react";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", package_id: "", payment_method: "cash" as "cash" | "transfer" | "qris", notes: "" });
  const [pdfUrl, setPdfUrl] = useState("");

  const selectedPkg = packages.find(p => p.package_id === form.package_id);
  const amount = selectedPkg?.package_price ?? 0;
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const packageMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') { const d = getPresetDates(p); setStartDate(d.start); setEndDate(d.end); }
  };

  const handleSubmit = () => {
    mutation.mutate({ payment_date: today, member_id: form.member_id, package_id: form.package_id, amount, payment_method: form.payment_method, notes: form.notes });
    setModalOpen(false);
    setForm({ member_id: "", package_id: "", payment_method: "cash", notes: "" });
  };

  const printReceipt = async (row: any) => {
    const doc = await generatePaymentReceipt({ payment_id: row.payment_id, payment_date: row.payment_date, member_name: memberMap[row.member_id] || '-', package_name: packageMap[row.package_id] || '-', amount: row.amount, payment_method: row.payment_method, notes: row.notes });
    setPdfUrl(previewPdf(doc));
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
                    onClick={() => printReceipt(p)}
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
          <Select label="Member" options={[{ value: "", label: t('payments.select_member') }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} />
          <Select label={t('packages.title')} options={[{ value: "", label: t('payments.select_package') }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))]} value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} />
          <Input label={t('payments.amount')} value={formatCurrency(amount)} disabled />
          <Select label={t('payments.method')} options={[{ value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "qris", label: "QRIS" }]} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as any })} />
          <Input label={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.member_id || !form.package_id}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-pembayaran.pdf" />
    </div>
  );
}
