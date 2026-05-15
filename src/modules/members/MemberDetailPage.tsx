import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember, useBookings, useMemberPayments, useMemberPackages } from '@/hooks';
import { Card, Badge, DataTable, Button } from '@/components/ui';
import { formatDate, formatCurrency } from '@/utils';
import type { Booking, MemberPayment, MemberPackage } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function MemberDetailPage() {
  const { t } = useTranslation();
  const { id: member_id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: member } = useMember(member_id!);
  const { data: bookings = [] } = useBookings({ member_id });
  const { data: payments = [] } = useMemberPayments({ member_id });
  const { data: packages = [] } = useMemberPackages(member_id);

  const TABS = [
    { key: 'booking', label: t('nav.bookings') },
    { key: 'pembayaran', label: t('nav.payments') },
    { key: 'paket', label: t('nav.packages') },
    { key: 'kehadiran', label: t('reports.attendance') },
  ] as const;

  const [tab, setTab] = useState<string>(TABS[0].key);

  if (!member) return null;

  const attended = bookings.filter(b => b.booking_status === 'attended');

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-zen-ink/50 hover:text-zen-brand transition-colors min-h-[44px]">
        <ArrowLeft size={18} /> <span className="text-[10px] uppercase tracking-widest font-bold">{t('members.back')}</span>
      </button>

      <Card title={member.full_name}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            [t('members.phone'), member.phone_number || '-'],
            [t('members.email'), member.email || '-'],
            [t('members.gender'), member.gender],
            [t('members.birth_date'), member.birth_date ? formatDate(member.birth_date) : '-'],
            [t('members.join_date'), formatDate(member.join_date)],
            [t('members.address'), member.address || '-'],
            [t('members.notes'), member.notes || '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between sm:flex-col gap-1 py-2 border-b border-zen-brand/5 last:border-0">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{label}</span>
              <span className="font-medium text-right sm:text-left">{value}</span>
            </div>
          ))}
          <div className="flex justify-between sm:flex-col gap-1 py-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{t('members.status')}</span>
            <Badge variant={member.status_active ? 'success' : 'danger'}>{member.status_active ? t('members.active') : t('members.inactive')}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-zen-brand/5 -mx-2 px-2 scrollbar-hide">
          {TABS.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={cn(
                'px-4 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all min-h-[44px]',
                tab === item.key ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50 hover:text-zen-ink'
              )}>
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'booking' && (
          <DataTable
            columns={[
              { key: 'booking_date', label: t('bookings.date'), render: (r: Booking) => formatDate(r.booking_date) },
              { key: 'booking_time', label: t('bookings.time') },
              { key: 'booking_status', label: t('bookings.status'), render: (r: Booking) => <Badge variant={r.booking_status === 'attended' ? 'success' : r.booking_status === 'cancelled' ? 'danger' : 'info'}>{r.booking_status}</Badge> },
            ]}
            data={bookings}
          />
        )}

        {tab === 'pembayaran' && (
          <DataTable
            columns={[
              { key: 'payment_date', label: t('bookings.date'), render: (r: MemberPayment) => formatDate(r.payment_date) },
              { key: 'amount', label: t('payments.amount'), render: (r: MemberPayment) => formatCurrency(r.amount) },
              { key: 'payment_method', label: t('payments.method') },
            ]}
            data={payments}
          />
        )}

        {tab === 'paket' && (
          <DataTable
            columns={[
              { key: 'purchase_date', label: t('bookings.date'), render: (r: MemberPackage) => formatDate(r.purchase_date) },
              { key: 'remaining_sessions', label: t('reports.remaining_sessions') },
              { key: 'expired_date', label: t('reports.expired'), render: (r: MemberPackage) => formatDate(r.expired_date) },
              { key: 'status', label: t('members.status'), render: (r: MemberPackage) => <Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge> },
            ]}
            data={packages}
          />
        )}

        {tab === 'kehadiran' && (
          <DataTable
            columns={[
              { key: 'booking_date', label: t('bookings.date'), render: (r: Booking) => formatDate(r.booking_date) },
              { key: 'booking_time', label: t('bookings.time') },
            ]}
            data={attended}
          />
        )}
      </Card>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(' '); }
