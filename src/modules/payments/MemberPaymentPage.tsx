import { useState } from "react";
import { useMembers, usePackages, useMemberPayments, useMemberPaymentMutation } from "@/hooks";
import { formatCurrency, formatDate } from "@/utils";
import { generatePaymentReceipt, previewPdf } from "@/utils/pdf";
import { Button, Modal, Input, Select, DataTable, DateRangeFilter } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";
import { Printer } from "lucide-react";

export default function MemberPaymentPage() {
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

  const memberOptions = [{ value: "", label: "-- Pilih Member --" }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))];
  const packageOptions = [{ value: "", label: "-- Pilih Paket --" }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))];
  const methodOptions = [{ value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "qris", label: "QRIS" }];

  const handleSubmit = () => {
    mutation.mutate({ payment_date: today, member_id: form.member_id, package_id: form.package_id, amount, payment_method: form.payment_method, notes: form.notes });
    setModalOpen(false);
    setForm({ member_id: "", package_id: "", payment_method: "cash", notes: "" });
  };

  const getMemberName = (id: string) => members.find(m => m.member_id === id)?.full_name ?? "-";
  const getPackageName = (id: string) => packages.find(p => p.package_id === id)?.package_name ?? "-";

  const columns = [
    { key: "payment_date", label: "Tanggal", render: (row: any) => formatDate(row.payment_date) },
    { key: "member_id", label: "Member", render: (row: any) => getMemberName(row.member_id) },
    { key: "package_id", label: "Paket", render: (row: any) => getPackageName(row.package_id) },
    { key: "amount", label: "Jumlah", render: (row: any) => formatCurrency(row.amount) },
    { key: "payment_method", label: "Metode", render: (row: any) => row.payment_method.toUpperCase() },
    { key: "actions", label: "", render: (row: any) => (
      <Button size="sm" variant="ghost" onClick={() => {
        const doc = generatePaymentReceipt({ payment_id: row.payment_id, payment_date: row.payment_date, member_name: getMemberName(row.member_id), package_name: getPackageName(row.package_id), amount: row.amount, payment_method: row.payment_method, notes: row.notes });
        setPdfUrl(previewPdf(doc));
      }}><Printer size={14} /></Button>
    )},
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pembayaran Member</h1>
        <Button onClick={() => setModalOpen(true)}>Catat Pembayaran</Button>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />

      <DataTable columns={columns} data={payments} emptyMessage="Belum ada pembayaran" />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Catat Pembayaran">
        <div className="space-y-4">
          <Select label="Member" options={memberOptions} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} />
          <Select label="Paket" options={packageOptions} value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} />
          <Input label="Jumlah" value={formatCurrency(amount)} disabled />
          <Select label="Metode Pembayaran" options={methodOptions} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as any })} />
          <Input label="Catatan" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleSubmit} className="w-full" disabled={!form.member_id || !form.package_id}>
            Simpan
          </Button>
        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-pembayaran.pdf" />
    </div>
  );
}
