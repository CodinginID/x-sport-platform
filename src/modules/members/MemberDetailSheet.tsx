import { DetailSheet, DetailRow, DetailSection } from '@/components/DetailSheet';
import { EntityCard } from '@/components/EntityCard';
import { useFeature } from '@/hooks/useFeature';
import { useStudioStore } from '@/stores/studio';
import { useMemberPackages, useBookings, useMemberPayments, usePackages, useCancelPendingPackage } from '@/hooks';
import { formatDate, formatCurrency } from '@/utils';
import type { Member } from '@/types';
import { Phone, Mail, MapPin } from 'lucide-react';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const MP_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Belum bayar', cls: 'bg-amber-100 text-amber-700' },
  depleted: { label: 'Habis', cls: 'bg-zen-ink/8 text-zen-ink/50' },
  expired: { label: 'Kadaluarsa', cls: 'bg-red-100 text-red-600' },
};

interface Props {
  member: Member | null;
  onClose: () => void;
}

export function MemberDetailSheet({ member, onClose }: Props) {
  const isPro = useFeature('pro');
  const studioName = useStudioStore(s => s.name);
  const { data: packages = [] } = useMemberPackages(member?.member_id);
  const { data: bookings = [] } = useBookings({ member_id: member?.member_id });
  const { data: payments = [] } = useMemberPayments({ member_id: member?.member_id });
  const { data: catalog = [] } = usePackages();
  const cancelPending = useCancelPendingPackage();

  if (!member) return null;

  const pkgName = (pid: string) => catalog.find(c => c.package_id === pid)?.package_name ?? 'Paket';
  const attended = bookings.filter(b => b.booking_status === 'attended');
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const activePackages = packages.filter(p => p.status === 'active');

  return (
    <DetailSheet
      open
      onClose={onClose}
      title={member.full_name}
      subtitle={member.status_active ? 'Aktif' : 'Nonaktif'}
    >
      {/* Pro card */}
      {isPro && (
        <EntityCard
          variant="member"
          studioName={studioName}
          name={member.full_name}
          subtitle={`ID ${member.member_id.slice(0, 8).toUpperCase()}`}
          infoRows={[
            {
              label: 'Paket Aktif',
              value: activePackages.length === 0
                ? 'Tidak ada'
                : `${pkgName(activePackages[0].package_id)} · ${activePackages[0].remaining_sessions}/${activePackages[0].total_sessions} sesi`,
            },
            { label: 'Tgl Gabung', value: formatDate(member.join_date) },
            { label: 'Status', value: member.status_active ? 'Aktif' : 'Nonaktif' },
          ]}
          qrValue={member.member_id}
        />
      )}

      {/* Avatar (non-pro fallback) */}
      {!isPro && (
        <div className="flex justify-center pt-1 pb-2">
          <div className="w-16 h-16 rounded-[20px] bg-zen-brand/10 text-zen-brand font-black text-xl flex items-center justify-center">
            {initials(member.full_name)}
          </div>
        </div>
      )}

      <DetailSection title="Kontak">
        {member.phone_number && <DetailRow label="Telepon" value={<span className="flex items-center gap-1"><Phone size={11} />{member.phone_number}</span>} />}
        {member.email && <DetailRow label="Email" value={<span className="flex items-center gap-1"><Mail size={11} />{member.email}</span>} />}
        {member.address && <DetailRow label="Alamat" value={<span className="flex items-center gap-1"><MapPin size={11} />{member.address}</span>} />}
        <DetailRow label="Tgl Gabung" value={formatDate(member.join_date)} />
        <DetailRow label="Status" value={
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${member.status_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {member.status_active ? 'Aktif' : 'Nonaktif'}
          </span>
        } />
      </DetailSection>

      <DetailSection title="Ringkasan">
        <DetailRow label="Total Booking" value={<span className="font-bold">{bookings.length}</span>} />
        <DetailRow label="Hadir" value={<span className="font-bold text-green-600">{attended.length}</span>} />
        <DetailRow label="Total Dibayar" value={<span className="font-bold text-zen-brand">{formatCurrency(totalPaid)}</span>} />
      </DetailSection>

      <DetailSection title="Paket">
        {packages.length === 0 ? (
          <p className="text-center text-xs text-zen-ink/30 py-4">Belum ada paket</p>
        ) : (
          packages.map(p => {
            const st = MP_STATUS[p.status] ?? MP_STATUS.depleted;
            return (
              <div key={p.member_package_id} className="py-3 border-b border-zen-ink/5 last:border-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{pkgName(p.package_id)}</p>
                    <p className="text-[10px] text-zen-ink/40">{p.remaining_sessions}/{p.total_sessions} sesi</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                {p.status === 'pending' && (
                  <button
                    onClick={() => cancelPending.mutate(p.member_package_id)}
                    disabled={cancelPending.isPending}
                    className="text-[11px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Batalkan paket belum bayar
                  </button>
                )}
              </div>
            );
          })
        )}
      </DetailSection>
    </DetailSheet>
  );
}
