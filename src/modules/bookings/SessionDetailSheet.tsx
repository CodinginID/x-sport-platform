import { useState, useEffect } from 'react';
import { DetailSheet, DetailSection } from '@/components/DetailSheet';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { CheckCircle2, XCircle, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { useMembers, useCoaches, usePackages, useActiveMemberPackages, useSessionParticipants, useRegisterParticipant, useBookingMutation, useTrainingSessionMutation, slotInfo } from '@/hooks';
import { formatCurrency } from '@/utils';
import type { TrainingSession } from '@/types';

const emptyForm = { memberId: '', memberPackageId: '', price: 0 };

export function SessionDetailSheet({ session, onClose }: { session: TrainingSession | null; onClose: () => void }) {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: coaches = [], isLoading: coachesLoading } = useCoaches();
  const { data: packages = [] } = usePackages();
  const { data: participants = [] } = useSessionParticipants(session?.training_session_id);
  const register = useRegisterParticipant();
  const bookingMutation = useBookingMutation();
  const sessionMutation = useTrainingSessionMutation();

  // Form daftar peserta v4: member → paket(member_package). Coach IKUT coach sesi (tidak dipilih di sini).
  const [form, setForm] = useState(emptyForm);
  const [editCoach, setEditCoach] = useState(false);
  const { data: memberPackages = [], isLoading: memberPackagesLoading } = useActiveMemberPackages(form.memberId);

  // Reset paket terpilih saat ganti member
  useEffect(() => { setForm(f => ({ ...f, memberPackageId: '', price: 0 })); }, [form.memberId]);

  if (!session) return null;
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const pkgMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));
  const slot = slotInfo(participants.length, session.capacity);
  const isOwner = useAuthStore.getState().user?.role === 'owner';

  const deleteBooking = (bookingId: string, memberName: string) => {
    useConfirmStore.getState().show({
      title: 'Hapus Booking?',
      message: `Booking "${memberName}" akan dihapus permanen dari sesi ini. Tindakan ini tidak bisa dibatalkan.`,
      variant: 'danger',
      onConfirm: () => bookingMutation.mutate({ action: 'delete', booking: { booking_id: bookingId } }),
    });
  };
  const coachName = session.coach_id ? (coachMap[session.coach_id] ?? '—') : null;

  const resetForm = () => setForm(emptyForm);

  // Saat pilih member_package → harga otomatis = harga paket terkait
  const onPickPackage = (memberPackageId: string) => {
    const mp = memberPackages.find(m => m.member_package_id === memberPackageId);
    const pkg = packages.find(p => p.package_id === mp?.package_id);
    setForm(f => ({ ...f, memberPackageId, price: pkg?.package_price ?? 0 }));
  };

  const setCoach = (coach_id: string) => {
    sessionMutation.mutate(
      { action: 'update', training_session_id: session.training_session_id, coach_id: coach_id || null },
      { onSuccess: () => setEditCoach(false) },
    );
  };

  const valid = form.memberId && form.memberPackageId && form.price >= 0;
  const doRegister = () => {
    if (!valid) return;
    register.mutate(
      {
        training_session_id: session.training_session_id,
        member_id: form.memberId,
        member_package_id: form.memberPackageId,
        price: form.price,
      },
      { onSuccess: resetForm },
    );
  };

  return (
    <DetailSheet open={!!session} onClose={onClose}
      title={session.session_time || 'Sesi'}
      subtitle={`${coachName ? `Coach ${coachName} · ` : ''}Slot ${slot.filled}/${slot.capacity}`}>

      {/* Coach sesi — set/ganti di sini (1 coach per sesi) */}
      <DetailSection title="Coach Sesi">
        {editCoach || !session.coach_id ? (
          <div className="flex gap-2">
            <SmartSelect
              className="flex-1"
              placeholder="Pilih coach..."
              value={session.coach_id ?? ''}
              onChange={setCoach}
              options={coaches.map(c => ({ value: c.coach_id, label: c.full_name }))}
              loading={coachesLoading}
              disabled={sessionMutation.isPending}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zen-ink">{coachName}</span>
            <button onClick={() => setEditCoach(true)} className="flex items-center gap-1.5 text-xs font-bold text-zen-brand">
              <Pencil size={13} /> Ganti
            </button>
          </div>
        )}
      </DetailSection>

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
                      {(pkgMap[p.package_id] ?? '—')} · {formatCurrency(p.package_price)}
                    </p>
                    <p className="text-[11px] text-zen-ink/40">{p.booking_status === 'attended' ? 'Hadir' : 'Terdaftar'}</p>
                  </div>
                  {p.booking_status === 'booked' ? (
                    <>
                      <button onClick={() => bookingMutation.mutate({ action: 'attend', booking: { booking_id: p.booking_id } })}
                        disabled={bookingMutation.isPending}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50" title="Tandai hadir (kurangi sisa sesi)">
                        <CheckCircle2 size={14} /> Hadir
                      </button>
                      <button onClick={() => bookingMutation.mutate({ action: 'cancel', booking: { booking_id: p.booking_id } })}
                        disabled={bookingMutation.isPending}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center disabled:opacity-50" title="Batalkan">
                        <XCircle size={15} />
                      </button>
                      {isOwner && (
                        <button onClick={() => deleteBooking(p.booking_id, memberMap[p.member_id] ?? '?')}
                          disabled={bookingMutation.isPending}
                          className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-red-50 flex items-center justify-center text-zen-ink/30 hover:text-red-500 transition-colors disabled:opacity-50" title="Hapus booking">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-600"><CheckCircle2 size={13} /> Hadir</span>
                      {isOwner && (
                        <button onClick={() => deleteBooking(p.booking_id, memberMap[p.member_id] ?? '?')}
                          disabled={bookingMutation.isPending}
                          className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-red-50 flex items-center justify-center text-zen-ink/30 hover:text-red-500 transition-colors disabled:opacity-50" title="Hapus booking">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </DetailSection>

      {!session.coach_id ? (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">Tetapkan coach sesi dulu sebelum mendaftarkan peserta.</p>
      ) : !slot.isFull ? (
        <DetailSection title="Daftarkan Peserta">
          <div className="space-y-2.5">
            <SmartSelect
              placeholder="Pilih member..."
              value={form.memberId}
              onChange={v => setForm(f => ({ ...f, memberId: v }))}
              options={members.map(m => ({ value: m.member_id, label: m.full_name }))}
              loading={membersLoading}
            />

            {form.memberId && (
              memberPackagesLoading
                ? (
                  <SmartSelect
                    placeholder="Pilih paket..."
                    value={form.memberPackageId}
                    onChange={onPickPackage}
                    options={[]}
                    loading
                  />
                )
                : memberPackages.length === 0
                ? <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">Member belum punya paket aktif. Buat pembayaran dulu.</p>
                : (
                  <SmartSelect
                    placeholder="Pilih paket..."
                    value={form.memberPackageId}
                    onChange={onPickPackage}
                    options={memberPackages.map(mp => ({ value: mp.member_package_id, label: `${pkgMap[mp.package_id] ?? mp.package_id} · sisa ${mp.remaining_sessions}` }))}
                  />
                )
            )}

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
      ) : (
        <p className="text-xs text-red-500 font-bold text-center pt-1">Slot penuh</p>
      )}
    </DetailSheet>
  );
}
