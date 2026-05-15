import { useState } from "react";
import { useBookings, useBookingMutation, useMembers, useCoaches, usePackages } from "@/hooks";
import { Modal, Button, Input, Select, DataTable, Badge, Card, QueryError } from "@/components/ui";
import { formatCurrency, formatDate } from "@/utils";
import { useTranslation } from "@/hooks/useTranslation";

const statusBadge = (status: string) => {
  const map: Record<string, 'info' | 'success' | 'danger' | 'default'> = { booked: 'info', attended: 'success', cancelled: 'danger', completed: 'default' };
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>;
};

const defaultForm = { member_id: "", coach_id: "", package_id: "", package_price: 0, booking_date: "", booking_time: "" };

export default function BookingsPage() {
  const { t } = useTranslation();
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: bookings = [], isError, refetch } = useBookings({ date: filterDate || undefined, status: filterStatus || undefined });
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
    { key: "booking_date", label: t('bookings.date'), render: (row: any) => formatDate(row.booking_date) },
    { key: "booking_time", label: t('bookings.time') },
    { key: "member_id", label: t('bookings.member'), render: (row: any) => members.find(m => m.member_id === row.member_id)?.full_name ?? "-" },
    { key: "coach_id", label: t('bookings.coach'), render: (row: any) => coaches.find(c => c.coach_id === row.coach_id)?.full_name ?? "-" },
    { key: "package_id", label: t('bookings.package'), render: (row: any) => packages.find(p => p.package_id === row.package_id)?.package_name ?? "-" },
    { key: "package_price", label: t('bookings.price'), render: (row: any) => formatCurrency(row.package_price) },
    { key: "booking_status", label: t('bookings.status'), render: (row: any) => statusBadge(row.booking_status) },
    {
      key: "actions", label: "", render: (row: any) => row.booking_status === 'booked' && (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: row.booking_id } })}>{t('bookings.checkin')}</Button>
          <Button size="sm" variant="danger" onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: row.booking_id } })}>{t('bookings.cancel')}</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
        <Button onClick={() => { setForm(defaultForm); setOpen(true); }}>{t('bookings.add')}</Button>
      </div>
      <div className="flex gap-4 mb-4">
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} label={t('bookings.date')} />
        <Select label={t('bookings.status')} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          options={[{ value: "", label: t("common.all") }, { value: "booked", label: t("bookings.booked") }, { value: "attended", label: t("bookings.attended") }, { value: "cancelled", label: t("bookings.cancelled") }, { value: "completed", label: t("bookings.completed") }]} />
      </div>
      {isError ? <QueryError onRetry={() => refetch()} /> : <DataTable columns={columns} data={bookings} emptyMessage={t("common.no_data")} />}
      <Modal open={open} onClose={() => setOpen(false)} title={t('bookings.add')}>
        <div className="space-y-4">
          <Select label={t('bookings.member')} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
            options={[{ value: "", label: t('bookings.select_member') }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]} />
          <Select label={t('bookings.coach')} value={form.coach_id} onChange={e => setForm({ ...form, coach_id: e.target.value })}
            options={[{ value: "", label: t('bookings.select_coach') }, ...coaches.map(c => ({ value: c.coach_id, label: c.full_name }))]} />
          <Select label={t('bookings.package')} value={form.package_id} onChange={e => handlePackageChange(e.target.value)}
            options={[{ value: "", label: t('bookings.select_package') }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))]} />
          <Input label={t('bookings.price')} type="number" value={form.package_price} readOnly />
          <Input label={t('bookings.date')} type="date" value={form.booking_date} onChange={e => setForm({ ...form, booking_date: e.target.value })} />
          <Input label={t('bookings.time')} type="time" value={form.booking_time} onChange={e => setForm({ ...form, booking_time: e.target.value })} />
          <Button onClick={handleSubmit} disabled={!form.member_id || !form.coach_id || !form.package_id || !form.booking_date || !form.booking_time}>{t('common.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
