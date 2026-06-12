import { useState } from 'react';
import { DetailSheet, DetailSection } from '@/components/DetailSheet';
import { CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import { useMembers, useCoaches, usePackages, useSessionParticipants, useRegisterParticipant, useBookingMutation, slotInfo } from '@/hooks';
import type { TrainingSession } from '@/types';

export function SessionDetailSheet({ session, onClose }: { session: TrainingSession | null; onClose: () => void }) {
  const { data: members = [] } = useMembers();
  const { data: coaches = [] } = useCoaches();
  const { data: packages = [] } = usePackages();
  const { data: participants = [] } = useSessionParticipants(session?.training_session_id);
  const register = useRegisterParticipant();
  const bookingMutation = useBookingMutation();
  const [memberId, setMemberId] = useState('');

  if (!session) return null;
  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachName = coaches.find(c => c.coach_id === session.coach_id)?.full_name ?? '—';
  const pkgName = packages.find(p => p.package_id === session.package_id)?.package_name ?? '—';
  const slot = slotInfo(participants.length, session.capacity);

  const doRegister = () => {
    if (!memberId) return;
    register.mutate({ training_session_id: session.training_session_id, member_id: memberId },
      { onSuccess: () => setMemberId('') });
  };

  return (
    <DetailSheet open={!!session} onClose={onClose}
      title={`${session.session_time} · ${pkgName}`}
      subtitle={`Coach ${coachName} · slot ${slot.filled}/${slot.capacity}`}>

      <DetailSection title={`Peserta (${slot.filled}/${slot.capacity})`}>
        {participants.length === 0
          ? <p className="text-xs text-zen-ink/40 py-2">Belum ada peserta.</p>
          : (
            <div className="divide-y divide-zen-ink/5">
              {participants.map(p => (
                <div key={p.booking_id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{memberMap[p.member_id] ?? '?'}</p>
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
        <div className="flex gap-2 pt-1">
          <select value={memberId} onChange={e => setMemberId(e.target.value)}
            className="flex-1 px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
            <option value="">Pilih member...</option>
            {members.map(m => <option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
          </select>
          <button onClick={doRegister} disabled={!memberId || register.isPending}
            className="px-4 rounded-2xl bg-zen-brand text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <UserPlus size={15} /> Daftar
          </button>
        </div>
      )}
      {slot.isFull && <p className="text-xs text-red-500 font-bold text-center pt-1">Slot penuh</p>}
    </DetailSheet>
  );
}
