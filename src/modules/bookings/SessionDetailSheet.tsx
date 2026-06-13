import { useState, useEffect } from 'react';
import { DetailSheet, DetailSection } from '@/components/DetailSheet';
import { CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import { useMembers, useCoaches, usePackages, useActiveMemberPackages, useSessionParticipants, useRegisterParticipant, useBookingMutation, slotInfo } from '@/hooks';
import { formatCurrency } from '@/utils';
import type { TrainingSession } from '@/types';

const emptyForm = { memberId: '', memberPackageId: '', coachId: '', price: 0 };

export function SessionDetailSheet({ session, onClose }: { session: TrainingSession | null; onClose: () => void }) {
  const { data: members = [] } = useMembers();
  const { data: coaches = [] } = useCoaches();
  const { data: packages = [] } = usePackages();
  const { data: participants = [] } = useSessionParticipants(session?.training_session_id);
  const register = useRegisterParticipant();
  const bookingMutation = useBookingMutation();

  // Form daftar peserta v3: member → paket(member_package) → coach. Harga otomatis dari paket.
  const [form, setForm] = useState(emptyForm);
  const { data: memberPackages = [] } = useActiveMemberPackages(form.memberId);

  // Reset paket terpilih saat ganti member
  useEffect(() => { setForm(f => ({ ...f, memberPackageId: '', price: 0 })); }, [form.memberId]);

  if (!session) return null;
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const pkgMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));
  const slot = slotInfo(participants.length, session.capacity);

  const resetForm = () => setForm(emptyForm);

  // Saat pilih member_package → harga otomatis = harga paket terkait (tidak bisa diubah manual)
  const onPickPackage = (memberPackageId: string) => {
    const mp = memberPackages.find(m => m.member_package_id === memberPackageId);
    const pkg = packages.find(p => p.package_id === mp?.package_id);
    setForm(f => ({ ...f, memberPackageId, price: pkg?.package_price ?? 0 }));
  };

  const valid = form.memberId && form.memberPackageId && form.coachId && form.price >= 0;
  const doRegister = () => {
    if (!valid) return;
    register.mutate(
      {
        training_session_id: session.training_session_id,
        member_id: form.memberId,
        member_package_id: form.memberPackageId,
        coach_id: form.coachId,
        price: form.price,
      },
      { onSuccess: resetForm },
    );
  };

  return (
    <DetailSheet open={!!session} onClose={onClose}
      title={session.session_time || 'Sesi'}
      subtitle={`Slot ${slot.filled}/${slot.capacity}`}>

      <DetailSection title={`Peserta (${slot.filled}/${slot.capacity})`}>
        {participants.length === 0
          ? <p className="text-xs text-zen-ink/40 py-2">Belum ada peserta.</p>
          : (
            <div className="divide-y divide-zen-ink/5">
              {participants.map(p => (
                <div key={p.booking_id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{memberMap[p.member_id] ?? '?'}</p>
                    <p className="text-[11px] text-zen-ink/40 truncate">
                      {(pkgMap[p.package_id] ?? '—')} · {(coachMap[p.coach_id] ?? '—')} · {formatCurrency(p.package_price)}
                    </p>
                    <p className="text-[11px] text-zen-ink/40">{p.booking_status === 'attended' ? 'Hadir' : 'Terdaftar'}</p>
                  </div>
                  {p.booking_status === 'booked' && (
                    <>
                      <button onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: p.booking_id } })}
                        className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center" title="Hadir">
                        <CheckCircle2 size={15} />
                      </button>
                      <button onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: p.booking_id } })}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center" title="Batalkan">
                        <XCircle size={15} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
      </DetailSection>

      {!slot.isFull && (
        <DetailSection title="Daftarkan Peserta">
          <div className="space-y-2.5">
            <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
              <option value="">Pilih member...</option>
              {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
            </select>

            {form.memberId && (
              memberPackages.length === 0
                ? <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">Member belum punya paket aktif. Buat pembayaran dulu.</p>
                : (
                  <select value={form.memberPackageId} onChange={e => onPickPackage(e.target.value)}
                    className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
                    <option value="">Pilih paket...</option>
                    {memberPackages.map(mp => (
                      <option key={mp.member_package_id} value={mp.member_package_id}>
                        {(pkgMap[mp.package_id] ?? mp.package_id)} · sisa {mp.remaining_sessions}
                      </option>
                    ))}
                  </select>
                )
            )}

            <select value={form.coachId} onChange={e => setForm(f => ({ ...f, coachId: e.target.value }))}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
              <option value="">Pilih coach...</option>
              {coaches.map(c => <option key={c.coach_id} value={c.coach_id}>{c.full_name}</option>)}
            </select>

            {form.memberPackageId && (
              <div className="flex items-center justify-between px-4 py-3 bg-zen-bg rounded-2xl">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Harga Paket</span>
                <span className="text-sm font-bold text-zen-brand">{formatCurrency(form.price)}</span>
              </div>
            )}

            <button onClick={doRegister} disabled={!valid || register.isPending}
              className="w-full px-4 py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <UserPlus size={15} /> Daftar
            </button>
          </div>
        </DetailSection>
      )}
      {slot.isFull && <p className="text-xs text-red-500 font-bold text-center pt-1">Slot penuh</p>}
    </DetailSheet>
  );
}
