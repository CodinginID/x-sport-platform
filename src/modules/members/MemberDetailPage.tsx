import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember, useBookings, useMemberPayments, useMemberPackages } from '@/hooks';
import { Card, Badge, DataTable, Button } from '@/components/ui';
import { formatDate, formatCurrency } from '@/utils';
import type { Booking, MemberPayment, MemberPackage } from '@/types';
import { ArrowLeft } from 'lucide-react';

const TABS = ['Booking', 'Pembayaran', 'Paket', 'Kehadiran'] as const;

export default function MemberDetailPage() {
  const { id: member_id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: member } = useMember(member_id!);
  const { data: bookings = [] } = useBookings({ member_id });
  const { data: payments = [] } = useMemberPayments({ member_id });
  const { data: packages = [] } = useMemberPackages(member_id);
  const [tab, setTab] = useState<typeof TABS[number]>(TABS[0]);

  if (!member) return null;

  const attended = bookings.filter(b => b.booking_status === 'attended');

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-zen-ink/50 hover:text-zen-brand transition-colors min-h-[44px]">
        <ArrowLeft size={18} /> <span className="text-[10px] uppercase tracking-widest font-bold">Kembali</span>
      </button>

      {/* Member Info - mobile friendly grid */}
      <Card title={member.full_name}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Telepon', member.phone_number || '-'],
            ['Email', member.email || '-'],
            ['Gender', member.gender],
            ['Tgl Lahir', member.birth_date ? formatDate(member.birth_date) : '-'],
            ['Bergabung', formatDate(member.join_date)],
            ['Alamat', member.address || '-'],
            ['Catatan', member.notes || '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between sm:flex-col gap-1 py-2 border-b border-zen-brand/5 last:border-0">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{label}</span>
              <span className="font-medium text-right sm:text-left">{value}</span>
            </div>
          ))}
          <div className="flex justify-between sm:flex-col gap-1 py-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Status</span>
            <Badge variant={member.status_active ? 'success' : 'danger'}>{member.status_active ? 'Aktif' : 'Nonaktif'}</Badge>
          </div>
        </div>
      </Card>

      {/* Tabs - horizontal scroll on mobile */}
      <Card>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-zen-brand/5 -mx-2 px-2 scrollbar-hide">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all min-h-[44px]',
                tab === t ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50 hover:text-zen-ink'
              )}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Booking' && (
          <DataTable
            columns={[
              { key: 'booking_date', label: 'Tanggal', render: (r: Booking) => formatDate(r.booking_date) },
              { key: 'booking_time', label: 'Jam' },
              { key: 'booking_status', label: 'Status', render: (r: Booking) => <Badge variant={r.booking_status === 'attended' ? 'success' : r.booking_status === 'cancelled' ? 'danger' : 'info'}>{r.booking_status}</Badge> },
            ]}
            data={bookings}
          />
        )}

        {tab === 'Pembayaran' && (
          <DataTable
            columns={[
              { key: 'payment_date', label: 'Tanggal', render: (r: MemberPayment) => formatDate(r.payment_date) },
              { key: 'amount', label: 'Jumlah', render: (r: MemberPayment) => formatCurrency(r.amount) },
              { key: 'payment_method', label: 'Metode' },
            ]}
            data={payments}
          />
        )}

        {tab === 'Paket' && (
          <DataTable
            columns={[
              { key: 'purchase_date', label: 'Beli', render: (r: MemberPackage) => formatDate(r.purchase_date) },
              { key: 'remaining_sessions', label: 'Sisa Sesi' },
              { key: 'expired_date', label: 'Expired', render: (r: MemberPackage) => formatDate(r.expired_date) },
              { key: 'status', label: 'Status', render: (r: MemberPackage) => <Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge> },
            ]}
            data={packages}
          />
        )}

        {tab === 'Kehadiran' && (
          <DataTable
            columns={[
              { key: 'booking_date', label: 'Tanggal', render: (r: Booking) => formatDate(r.booking_date) },
              { key: 'booking_time', label: 'Jam' },
            ]}
            data={attended}
          />
        )}
      </Card>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(' '); }
