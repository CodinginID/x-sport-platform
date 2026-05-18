import { useState } from "react";
import { useMembers, usePackages, useMemberPayments, useMemberPaymentMutation } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { generatePaymentReceipt, previewPdf } from "@/utils/pdf";
import { Button, Modal, Input, Select, DataTable, DateRangeFilter, ActionButtons } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";

export default function MemberPaymentPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
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

  const memberOptions = [{ value: "", label: t('payments.select_member') }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))];
  const packageOptions = [{ value: "", label: t('payments.select_package') }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))];
  const methodOptions = [{ value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "qris", label: "QRIS" }];

  const handleSubmit = () => {
    mutation.mutate({ payment_date: today, member_id: form.member_id, package_id: form.package_id, amount, payment_method: form.payment_method, notes: form.notes });
    setModalOpen(false);
    setForm({ member_id: "", package_id: "", payment_method: "cash", notes: "" });
  };

  const getMemberName = (id: string) => members.find(m => m.member_id === id)?.full_name ?? "-";
  const getPackageName = (id: string) => packages.find(p => p.package_id === id)?.package_name ?? "-";

  const columns = [
    { key: "payment_date", label: t('bookings.date'), render: (row: any) => formatDate(row.payment_date) },
    { key: "member_id", label: t("bookings.member"), render: (row: any) => getMemberName(row.member_id) },
    { key: "package_id", label: t('packages.title'), render: (row: any) => getPackageName(row.package_id) },
    { key: "amount", label: t('payments.amount'), render: (row: any) => formatCurrency(row.amount) },
    { key: "payment_method", label: t('payments.method'), render: (row: any) => row.payment_method.toUpperCase() },
    { key: "actions", label: "", render: (row: any) => (
      <ActionButtons actions={[
        { action: 'print', onClick: async () => { const doc = await generatePaymentReceipt({ payment_id: row.payment_id, payment_date: row.payment_date, member_name: getMemberName(row.member_id), package_name: getPackageName(row.package_id), amount: row.amount, payment_method: row.payment_method, notes: row.notes }); setPdfUrl(previewPdf(doc)); } },
      ]} />
    )},
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('payments.member_title')}</h1>
        <Button onClick={() => setModalOpen(true)}>{t('payments.add_payment')}</Button>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />

      <DataTable columns={columns} data={payments} emptyMessage={t('common.no_data')} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('payments.add_payment')}>
        <div className="space-y-4">
          <Select label="Member" options={memberOptions} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} />
          <Select label={t('packages.title')} options={packageOptions} value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} />
          <Input label={t('payments.amount')} value={formatCurrency(amount)} disabled />
          <Select label={t('payments.method')} options={methodOptions} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as any })} />
          <Input label={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleSubmit} className="w-full" disabled={!form.member_id || !form.package_id}>
            {t('common.save')}
          </Button>
        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-pembayaran.pdf" />
    </div>
  );
}
