import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Coach } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      const { data, error } = await supabase
        .from('coaches').select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Coach[];
    },
  });
}

export function useCoachMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'delete'; coach: Partial<Coach> }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

      if (data.action === 'delete') {
        const coachId = data.coach.coach_id!;
        // Null out FK references dulu untuk preserve history (DB juga SET NULL via FK constraint)
        const { error: e1 } = await supabase.from('training_sessions').update({ coach_id: null }).eq('coach_id', coachId).eq('studio_id', studioId);
        if (e1) throw new Error(`Gagal update sesi: ${e1.message}`);
        const { error: e2 } = await supabase.from('bookings').update({ coach_id: null }).eq('coach_id', coachId).eq('studio_id', studioId);
        if (e2) throw new Error(`Gagal update booking: ${e2.message}`);
        const { error } = await supabase.from('coaches').delete().eq('coach_id', coachId).eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      if (data.action === 'add') {
        const coach: Coach & { studio_id: string } = {
          coach_id: generateId(),
          studio_id: studioId,
          full_name: data.coach.full_name || '',
          phone_number: data.coach.phone_number || '',
          email: data.coach.email || '',
          active_status: data.coach.active_status ?? true,
          commission_regular_pct: data.coach.commission_regular_pct ?? 0,
          commission_private_pct: data.coach.commission_private_pct ?? 0,
          notes: data.coach.notes || '',
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from('coaches').insert(coach);
        if (error) throw new Error(error.message);
        return coach;
      }

      const { error } = await supabase.from('coaches')
        .update({ ...data.coach, updated_at: now })
        .eq('coach_id', data.coach.coach_id!)
        .eq('studio_id', studioId);
      if (error) throw new Error(error.message);
    },
    onMutate: (vars) => {
      if (vars.action === 'delete') {
        useToastStore.getState().addToast('Menghapus data coach dan riwayatnya...', 'info');
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['coaches'] });
      if (vars.action === 'delete') {
        qc.invalidateQueries({ queryKey: ['sessions'] });
        qc.invalidateQueries({ queryKey: ['bookings'] });
      }
      const msg = vars.action === 'add' ? 'Coach berhasil ditambahkan' : vars.action === 'delete' ? 'Coach berhasil dihapus' : 'Coach berhasil diperbarui';
      useToastStore.getState().addToast(msg, vars.action === 'delete' ? 'warning' : 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan coach', 'error'); },
  });
}
