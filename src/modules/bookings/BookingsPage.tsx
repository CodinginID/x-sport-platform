import { useState } from "react";
import { useBookings, useBookingMutation, useMembers, useCoaches, usePackages, usePackageCoaches } from "@/hooks";
import { Modal, Button, Input, Select, QueryError } from "@/components/ui";
import { formatCurrency, formatDate } from "@/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { Calendar, Plus, CheckCircle2, XCircle, CalendarX } from "lucide-react";

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: 'bg-blue-100 text-blue-700',
    attended: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    completed: 'bg-zen-bg text-zen-ink/60',
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${map[status] ?? 'bg-zen-bg text-zen-ink/50'}`}>
      {status}
    </span>
  );
}

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
  const { data: allPackageCoaches = [] } = usePackageCoaches();

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const packageMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));

  const handlePackageChange = (package_id: string) => {
    const pkg = packages.find(p => p.package_id === package_id);
    setForm({ ...form, package_id, package_price: pkg?.package_price ?? 0, coach_id: "" });
  };

  const filteredCoaches = form.package_id
    ? coaches.filter(c => allPackageCoaches.some(pc => pc.package_id === form.package_id && pc.coach_id === c.coach_id))
    : coaches.filter(c => c.active_status);

  const handleSubmit = () => {
    bookingMutation.mutate({ action: 'create', booking: { ...form } });
    setForm(defaultForm);
    setOpen(false);
  };

  const STATUS_OPTS = [
    { value: "", label: t("common.all") },
    { value: "booked", label: t("bookings.booked") },
    { value: "attended", label: t("bookings.attended") },
    { value: "cancelled", label: t("bookings.cancelled") },
    { value: "completed", label: t("bookings.completed") },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
        <Button onClick={() => { setForm(defaultForm); setOpen(true); }}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('bookings.add')}</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(opt => (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${filterStatus === opt.value ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <CalendarX size={32} className="mb-3" />
              <p className="text-sm">{t("common.no_data")}</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {bookings.map(b => {
                const memberName = memberMap[b.member_id] || '?';
                const coachName = coachMap[b.coach_id] || '—';
                const pkgName = packageMap[b.package_id] || '—';
                return (
                  <div key={b.booking_id} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(memberName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{memberName}</p>
                      <p className="text-xs text-zen-ink/40 truncate">{coachName} · {pkgName}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs font-bold">{formatDate(b.booking_date)}</p>
                      <p className="text-xs text-zen-ink/40">{b.booking_time}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={b.booking_status} />
                      {b.booking_status === 'booked' && (
                        <>
                          <button
                            onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: b.booking_id } })}
                            className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                            title="Hadir"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: b.booking_id } })}
                            className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors"
                            title="Batalkan"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('bookings.add')}>
        <div className="space-y-4">
          <Select label={t('bookings.member')} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
            options={[{ value: "", label: t('bookings.select_member') }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]} />
          <Select label={t('bookings.package')} value={form.package_id} onChange={e => handlePackageChange(e.target.value)}
            options={[{ value: "", label: t('bookings.select_package') }, ...packages.map(p => ({ value: p.package_id, label: `${p.package_name} - ${formatCurrency(p.package_price)}` }))]} />
          <Select label={t('bookings.coach')} value={form.coach_id} onChange={e => setForm({ ...form, coach_id: e.target.value })}
            options={[{ value: "", label: t('bookings.select_coach') }, ...filteredCoaches.map(c => ({ value: c.coach_id, label: c.full_name }))]} />
          <Input label={t('bookings.price')} value={form.package_price ? formatCurrency(form.package_price) : ''} readOnly />
          <Input label={t('bookings.date')} type="date" value={form.booking_date} onChange={e => setForm({ ...form, booking_date: e.target.value })} />
          <Input label={t('bookings.time')} type="time" value={form.booking_time} onChange={e => setForm({ ...form, booking_time: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.member_id || !form.coach_id || !form.package_id || !form.booking_date || !form.booking_time}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
