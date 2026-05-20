import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember, useBookings, useMemberPayments, useMemberPackages } from '@/hooks';
import { formatDate, formatCurrency } from '@/utils';
import type { Booking, MemberPayment, MemberPackage } from '@/types';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard, Award } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function sessionPct(remaining: number, total: number) {
  if (!total) return 0;
  return Math.round((remaining / total) * 100);
}

const TABS = ['booking', 'pembayaran', 'paket', 'kehadiran'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  booking: 'Booking',
  pembayaran: 'Pembayaran',
  paket: 'Paket',
  kehadiran: 'Kehadiran',
};

export default function MemberDetailPage() {
  const { t } = useTranslation();
  const { id: member_id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: member } = useMember(member_id!);
  const { data: bookings = [] } = useBookings({ member_id });
  const { data: payments = [] } = useMemberPayments({ member_id });
  const { data: packages = [] } = useMemberPackages(member_id);
  const [tab, setTab] = useState<Tab>('booking');

  if (!member) return null;

  const attended = bookings.filter(b => b.booking_status === 'attended');
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const activePackages = packages.filter(p => p.status === 'active');

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/members')}
        className="flex items-center gap-2 text-zen-ink/50 hover:text-zen-brand transition-colors">
        <ArrowLeft size={16} />
        <span className="text-[10px] uppercase tracking-widest font-bold">{t('members.back')}</span>
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-3xl p-6 border border-zen-ink/5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-3xl bg-zen-brand/10 text-zen-brand font-bold text-xl flex items-center justify-center shrink-0">
            {initials(member.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{member.full_name}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${member.status_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {member.status_active ? t('members.active') : t('members.inactive')}
              </span>
            </div>
            <p className="text-xs text-zen-ink/40">{t('members.join_date')}: {formatDate(member.join_date)}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {member.phone_number && (
            <div className="flex items-center gap-3 p-3 bg-zen-bg rounded-2xl">
              <Phone size={14} className="text-zen-brand shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('members.phone')}</p>
                <p className="text-sm font-medium">{member.phone_number}</p>
              </div>
            </div>
          )}
          {member.email && (
            <div className="flex items-center gap-3 p-3 bg-zen-bg rounded-2xl">
              <Mail size={14} className="text-zen-brand shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('members.email')}</p>
                <p className="text-sm font-medium truncate">{member.email}</p>
              </div>
            </div>
          )}
          {member.address && (
            <div className="flex items-center gap-3 p-3 bg-zen-bg rounded-2xl sm:col-span-2">
              <MapPin size={14} className="text-zen-brand shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('members.address')}</p>
                <p className="text-sm font-medium">{member.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zen-bg rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1 text-zen-brand"><Calendar size={16} /></div>
          <p className="text-xl font-bold">{bookings.length}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Booking</p>
        </div>
        <div className="bg-zen-bg rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1 text-green-500"><Award size={16} /></div>
          <p className="text-xl font-bold">{activePackages.length}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Paket Aktif</p>
        </div>
        <div className="bg-zen-bg rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-1 text-zen-brand"><CreditCard size={16} /></div>
          <p className="text-xl font-bold text-sm">{formatCurrency(totalPaid)}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total Bayar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {/* Tab nav */}
        <div className="flex gap-2 p-4 border-b border-zen-ink/5 overflow-x-auto scrollbar-hide">
          {TABS.map(key => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all ${tab === key ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50 hover:text-zen-ink'}`}>
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="divide-y divide-zen-ink/5">
          {tab === 'booking' && (
            bookings.length === 0 ? <EmptyTab label="Belum ada booking" /> :
            bookings.map(b => (
              <div key={b.booking_id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold">{formatDate(b.booking_date)}</p>
                  <p className="text-xs text-zen-ink/40">{b.booking_time}</p>
                </div>
                <StatusBadge status={b.booking_status} />
              </div>
            ))
          )}

          {tab === 'pembayaran' && (
            payments.length === 0 ? <EmptyTab label="Belum ada pembayaran" /> :
            payments.map(p => (
              <div key={p.payment_id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold">{formatDate(p.payment_date)}</p>
                  <p className="text-xs text-zen-ink/40">{p.payment_method.toUpperCase()}</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
              </div>
            ))
          )}

          {tab === 'paket' && (
            packages.length === 0 ? <EmptyTab label="Belum ada paket" /> :
            packages.map(p => {
              const pct = sessionPct(p.remaining_sessions, p.total_sessions);
              return (
                <div key={p.member_package_id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Paket</p>
                      <p className="text-xs text-zen-ink/40">Exp: {formatDate(p.expired_date)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {p.remaining_sessions}/{p.total_sessions} sesi
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zen-ink/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}

          {tab === 'kehadiran' && (
            attended.length === 0 ? <EmptyTab label="Belum ada kehadiran" /> :
            attended.map(b => (
              <div key={b.booking_id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold">{formatDate(b.booking_date)}</p>
                  <p className="text-xs text-zen-ink/40">{b.booking_time}</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">hadir</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return <p className="text-center text-sm text-zen-ink/30 py-10">{label}</p>;
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
