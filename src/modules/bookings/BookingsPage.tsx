import { useState } from "react";
import { useBookings, useBookingMutation, useMembers, useCoaches, usePackages } from "@/hooks";
import { Modal, Button, Input, Select, DataTable, Badge, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/utils";

const statusBadge = (status: string) => {
  const map: Record<string, 'info' | 'success' | 'danger' | 'default'> = { booked: 'info', attended: 'success', cancelled: 'danger', completed: 'default' };
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>;
};

const defaultForm = { member_id: "", coach_id: "", package_id: "", package_price: 0, booking_date: "", booking_time: "" };

export default function BookingsPage() {
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: bookings = [] } = useBookings({ date: filterDate || undefined, status: filterStatus || undefined });
  const bookingMutation = useBookingMutation();
  const { data: members = [] } = useMembers();
  const { data: coaches = [] } = useCoaches();
  const { data: packages = [] } = usePackages();

  const handlePackageChange = (package_id: string) => {
    const pkg = packages.find(p => p.package_id === package_id);
    setForm({ ...form, package_id, package_price: pkg?.package_price ?? 0 });
  };

  const handleSubmit = () => {
    bookingMutation.mutate({ action: 'create', booking: { ...form } });
    setForm(defaultForm);
    setOpen(false);
  };

  const columns = [
    { key: "booking_date", label: "Tanggal", render: (row: any) => formatDate(row.booking_date) },
    { key: "booking_time", label: "Jam" },
    { key: "member_id", label: "Member", render: (row: any) => members.find(m => m.member_id === row.member_id)?.full_name ?? "-" },
    { key: "coach_id", label: "Coach", render: (row: any) => coaches.find(c => c.coach_id === row.coach_id)?.full_name ?? "-" },
    { key: "package_id", label: "Paket", render: (row: any) => packages.find(p => p.package_id === row.package_id)?.package_name ?? "-" },
    { key: "package_price", label: "Harga", render: (row: any) => formatCurrency(row.package_price) },
    { key: "booking_status", label: "Status", render: (row: any) => statusBadge(row.booking_status) },
    {
      key: "actions", label: "", render: (row: any) => row.booking_status === 'booked' && (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: row.booking_id } })}>Check-In</Button>
          <Button size="sm" variant="danger" onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: row.booking_id } })}>Cancel</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Button onClick={() => { setForm(defaultForm); setOpen(true); }}>Buat Booking</Button>
      </div>
      <div className="flex gap-4 mb-4">
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} label="Filter Tanggal" />
        <Select label="Filter Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          options={[{ value: "", label: "Semua" }, { value: "booked", label: "Booked" }, { value: "attended", label: "Attended" }, { value: "cancelled", label: "Cancelled" }, { value: "completed", label: "Completed" }]} />
      </div>
      <DataTable columns={columns} data={bookings} emptyMessage="Belum ada booking" />
      <Modal open={open} onClose={() => setOpen(false)} title="Buat Booking">
        <div className="space-y-4">
          <Select label="Member" value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
            options={[{ value: "", label: "Pilih Member" }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]} />
          <Select label="Coach" value={form.coach_id} onChange={e => setForm({ ...form, coach_id: e.target.value })}
            options={[{ value: "", label: "Pilih Coach" }, ...coaches.map(c => ({ value: c.coach_id, label: c.full_name }))]} />
          <Select label="Paket" value={form.package_id} onChange={e => handlePackageChange(e.target.value)}
            options={[{ value: "", label: "Pilih Paket" }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))]} />
          <Input label="Harga Paket" type="number" value={form.package_price} readOnly />
          <Input label="Tanggal" type="date" value={form.booking_date} onChange={e => setForm({ ...form, booking_date: e.target.value })} />
          <Input label="Jam" type="time" value={form.booking_time} onChange={e => setForm({ ...form, booking_time: e.target.value })} />
          <Button onClick={handleSubmit} disabled={!form.member_id || !form.coach_id || !form.package_id || !form.booking_date || !form.booking_time}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
