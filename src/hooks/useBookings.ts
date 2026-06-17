import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Booking } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function useBookings(filters?: { date?: string; status?: string; member_id?: string; coach_id?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('bookings').select('*').eq('studio_id', studioId).order('booking_date', { ascending: false });
      if (filters?.date)      q = q.eq('booking_date', filters.date);
      if (filters?.status)    q = q.eq('booking_status', filters.status);
      if (filters?.member_id) q = q.eq('member_id', filters.member_id);
      if (filters?.coach_id)  q = q.eq('coach_id', filters.coach_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Booking[];
    },
  });
}

export function useBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'create' | 'attend' | 'cancel' | 'delete'; booking: Partial<Booking> }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

      if (data.action === 'create') {
        // Cek apakah member sudah punya paket aktif untuk package ini
        // Kalau ada, langsung link agar tidak perlu bayar lagi (FIFO — pakai yang paling lama)
        const { data: activePkg } = await supabase
          .from('member_packages')
          .select('member_package_id')
          .eq('studio_id', studioId)
          .eq('member_id', data.booking.member_id!)
          .eq('package_id', data.booking.package_id!)
          .eq('status', 'active')
          .gt('remaining_sessions', 0)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const booking: Booking & { studio_id: string } = {
          booking_id: generateId(),
          studio_id: studioId,
          booking_date: data.booking.booking_date || now.split('T')[0],
          booking_time: data.booking.booking_time || '',
          member_id: data.booking.member_id || '',
          coach_id: data.booking.coach_id || '',
          package_id: data.booking.package_id || '',
          member_package_id: activePkg?.member_package_id ?? null,
          training_session_id: data.booking.training_session_id ?? null,
          package_price: data.booking.package_price ?? 0,
          booking_status: 'booked',
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from('bookings').insert(booking);
        if (error) throw new Error(error.message);
        return booking;
      }

      if (data.action === 'delete') {
        const { error } = await supabase.from('bookings')
          .delete()
          .eq('booking_id', data.booking.booking_id!)
          .eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      if (data.action === 'cancel') {
        const { error } = await supabase.from('bookings')
          .update({ booking_status: 'cancelled', updated_at: now })
          .eq('booking_id', data.booking.booking_id!)
          .eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      // attend — atomic via Postgres RPC
      const { error } = await supabase.rpc('attend_booking', {
        p_booking_id: data.booking.booking_id!,
        p_studio_id: studioId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['activeMemberPackages'] });
      qc.invalidateQueries({ queryKey: ['unpaidBookings'] });
      qc.invalidateQueries({ queryKey: ['coachCommissions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      // Refresh tampilan sesi latihan (peserta + badge slot) saat hadir/batal dari sheet sesi
      qc.invalidateQueries({ queryKey: ['sessionParticipants'] });
      qc.invalidateQueries({ queryKey: ['sessionCounts'] });
      const msg = vars.action === 'create' ? 'Booking berhasil dibuat' : vars.action === 'attend' ? 'Check-in berhasil' : vars.action === 'delete' ? 'Booking dihapus' : 'Booking dibatalkan';
      useToastStore.getState().addToast(msg, vars.action === 'cancel' || vars.action === 'delete' ? 'warning' : 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal memproses booking', 'error'); },
  });
}
