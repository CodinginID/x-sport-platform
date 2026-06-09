import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import { useToastStore } from '@/stores/toast';
import type { MemberPackage } from '@/types';

/** Paket aktif milik member tertentu, urut yang paling lama dulu (FIFO) */
export function useActiveMemberPackages(member_id: string) {
  return useQuery({
    queryKey: ['activeMemberPackages', member_id],
    enabled: !!member_id,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      const { data, error } = await supabase
        .from('member_packages')
        .select('*')
        .eq('studio_id', studioId)
        .eq('member_id', member_id)
        .eq('status', 'active')
        .gt('remaining_sessions', 0)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as MemberPackage[];
    },
  });
}

export function useWalkInMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      member_id: string;
      member_package_id: string;
      coach_id: string;
      date: string;
      time: string;
    }) => {
      const studioId = requireStudioId();
      const { data, error } = await supabase.rpc('walk_in_attendance', {
        p_studio_id:         studioId,
        p_member_id:         input.member_id,
        p_member_package_id: input.member_package_id,
        p_coach_id:          input.coach_id,
        p_date:              input.date,
        p_time:              input.time,
      });
      if (error) throw new Error(error.message);
      return data as { ok: boolean; booking_id: string; remaining_sessions: number };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['memberPackages'] });
      qc.invalidateQueries({ queryKey: ['activeMemberPackages'] });
      qc.invalidateQueries({ queryKey: ['coachCommissions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      useToastStore.getState().addToast(
        `Check-in berhasil · Sisa sesi: ${result.remaining_sessions}`,
        'success',
      );
    },
    onError: (e: Error) => {
      useToastStore.getState().addToast(e.message || 'Gagal check-in', 'error');
    },
  });
}
