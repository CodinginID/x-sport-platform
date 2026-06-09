import { useState } from "react";
import { useBookings, useBookingMutation, useMembers, useCoaches, usePackages, usePackageCoaches } from "@/hooks";
import { Modal, Button, Input, Select, QueryError } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import { DetailSheet, DetailRow, DetailSection } from "@/components/DetailSheet";
import { formatCurrency, formatDate } from "@/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { Calendar, Plus, CheckCircle2, XCircle, CalendarX, CreditCard, Boxes, Clock, User, ChevronRight, Tag } from "lucide-react";
import type { Booking } from "@/types";

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
  const [detail, setDetail] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading, isError, refetch } = useBookings({ date: filterDate || undefined, status: filterStatus || undefined });
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
    setForm({ ...form, package_id, package_price: pkg?.package_price ?? 0, coach_id: '' });
  };

  // Semua coach yang terhubung ke paket yang sedang dipilih
  const packageCoachOptions = allPackageCoaches
    .filter(pc => pc.package_id === form.package_id)
    .map(pc => ({ value: pc.coach_id, label: coachMap[pc.coach_id] ?? pc.coach_id }));

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
      {isLoading ? <ListSkeleton rows={6} /> : isError ? <QueryError onRetry={() => refetch()} /> : (
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
                  <div key={b.booking_id} className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zen-bg transition-colors" onClick={() => setDetail(b)}>
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
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <StatusBadge status={b.booking_status} />
                      {b.booking_status === 'booked' && (
                        <>
                          {b.member_package_id == null ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-bold whitespace-nowrap">
                              <CreditCard size={11} />
                              Belum Bayar
                            </span>
                          ) : (
                            <button
                              onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: b.booking_id } })}
                              className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                              title="Hadir"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
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

      {/* Booking Detail Sheet */}
      {detail && (() => {
        const STATUS_COLOR: Record<string, string> = {
          booked: 'bg-blue-100 text-blue-700',
          attended: 'bg-green-100 text-green-700',
          cancelled: 'bg-red-100 text-red-600',
          completed: 'bg-zen-bg text-zen-ink/60',
        };
        return (
          <DetailSheet
            open={!!detail}
            onClose={() => setDetail(null)}
            title={memberMap[detail.member_id] || '—'}
            subtitle={`Booking · ${formatDate(detail.booking_date)}`}
          >
            {/* Status hero */}
            <div className="flex justify-center">
              <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full ${STATUS_COLOR[detail.booking_status] ?? 'bg-zen-bg text-zen-ink/50'}`}>
                {detail.booking_status.toUpperCase()}
              </span>
            </div>

            <DetailSection title="Jadwal">
              <DetailRow label="Tanggal" value={<span className="flex items-center gap-1"><Calendar size={11} />{formatDate(detail.booking_date)}</span>} />
              <DetailRow label="Jam" value={<span className="flex items-center gap-1"><Clock size={11} />{detail.booking_time?.slice(0, 5)}</span>} />
            </DetailSection>

            <DetailSection title="Sesi">
              <DetailRow label="Paket" value={<span className="flex items-center gap-1"><Boxes size={11} />{packageMap[detail.package_id] || '—'}</span>} />
              <DetailRow label="Coach" value={<span className="flex items-center gap-1"><User size={11} />{coachMap[detail.coach_id] || '—'}</span>} />
              <DetailRow label="Harga" value={<span className="flex items-center gap-1"><Tag size={11} />{formatCurrency(detail.package_price)}</span>} accent />
            </DetailSection>

            <DetailSection title="Pembayaran">
              <DetailRow
                label="Status Bayar"
                value={detail.member_package_id
                  ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Lunas</span>
                  : <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Belum Bayar</span>
                }
              />
            </DetailSection>

            {detail.booking_status === 'booked' && (
              <div className="flex gap-2 pt-1">
                {detail.member_package_id && (
                  <button
                    onClick={() => { bookingMutation.mutate({ action: 'attend', booking: { booking_id: detail.booking_id } }); setDetail(null); }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} /> Hadir
                  </button>
                )}
                <button
                  onClick={() => { bookingMutation.mutate({ action: 'cancel', booking: { booking_id: detail.booking_id } }); setDetail(null); }}
                  className="flex-1 py-3 bg-red-50 text-red-500 hover:bg-red-100 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <XCircle size={15} /> Batalkan
                </button>
              </div>
            )}
          </DetailSheet>
        );
      })()}

      {/* Add Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('bookings.add')}>
        <div className="space-y-5">

          {/* Member */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Member</label>
            <select
              value={form.member_id}
              onChange={e => setForm({ ...form, member_id: e.target.value })}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium text-zen-ink outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none"
            >
              <option value="">Pilih member...</option>
              {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
            </select>
          </div>

          {/* Package */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Paket</label>
            <select
              value={form.package_id}
              onChange={e => handlePackageChange(e.target.value)}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium text-zen-ink outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none"
            >
              <option value="">Pilih paket...</option>
              {packages.map(p => <option key={p.package_id} value={p.package_id}>{p.package_name}</option>)}
            </select>
          </div>

          {/* Package info card + Coach chips — muncul setelah pilih paket */}
          {form.package_id && (() => {
            const pkg = packages.find(p => p.package_id === form.package_id);
            return (
              <div className="rounded-2xl overflow-hidden border border-zen-ink/8">
                {/* Package summary */}
                <div className="bg-zen-brand/6 px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zen-brand/15 flex items-center justify-center shrink-0">
                    <Boxes size={15} className="text-zen-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zen-ink truncate">{pkg?.package_name}</p>
                    <p className="text-[11px] text-zen-ink/40 mt-0.5">
                      {pkg?.session_count ? `${pkg.session_count} sesi` : pkg?.package_type}
                      {pkg?.valid_days ? ` · ${pkg.valid_days} hari` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-zen-brand shrink-0">{formatCurrency(pkg?.package_price ?? 0)}</span>
                </div>

                {/* Divider + Coach selector */}
                <div className="px-4 py-3.5 bg-white">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-3">Pilih Coach</p>
                  {packageCoachOptions.length === 0 ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                      <ChevronRight size={13} className="shrink-0" />
                      <p className="text-xs font-medium">Paket ini belum punya coach. Tambahkan di menu Paket.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {packageCoachOptions.map(opt => {
                        const selected = form.coach_id === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, coach_id: opt.value })}
                            className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                              selected
                                ? 'bg-zen-brand text-white border-zen-brand shadow-sm'
                                : 'bg-zen-bg text-zen-ink/60 border-zen-ink/10 hover:border-zen-brand/40 hover:text-zen-ink'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${selected ? 'bg-white/20' : 'bg-zen-ink/8'}`}>
                              {initials(opt.label)}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Tanggal + Jam — muncul setelah pilih coach */}
          {form.coach_id && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={10} />Tanggal
                </label>
                <input
                  type="date"
                  value={form.booking_date}
                  onChange={e => setForm({ ...form, booking_date: e.target.value })}
                  className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 flex items-center gap-1.5">
                  <Clock size={10} />Jam
                </label>
                <input
                  type="time"
                  value={form.booking_time}
                  onChange={e => setForm({ ...form, booking_time: e.target.value })}
                  className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30"
                />
              </div>
            </div>
          )}

          {/* Summary sebelum simpan */}
          {form.member_id && form.coach_id && form.booking_date && form.booking_time && (
            <div className="bg-zen-bg rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                {initials(members.find(m => m.member_id === form.member_id)?.full_name ?? '?')}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-bold truncate">{members.find(m => m.member_id === form.member_id)?.full_name}</p>
                <p className="text-zen-ink/40 mt-0.5 truncate">
                  {coachMap[form.coach_id]} · {formatDate(form.booking_date)} {form.booking_time.slice(0, 5)}
                </p>
              </div>
              <User size={14} className="text-zen-brand shrink-0" />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{t('common.cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.member_id || !form.coach_id || !form.package_id || !form.booking_date || !form.booking_time}
              className="flex-1"
            >
              Buat Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
