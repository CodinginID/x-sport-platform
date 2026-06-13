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
    mutationFn: async (data: { action: 'add' | 'update'; coach: Partial<Coach> }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['coaches'] });
      useToastStore.getState().addToast(vars.action === 'add' ? 'Coach berhasil ditambahkan' : 'Coach berhasil diperbarui', 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan coach', 'error'); },
  });
}
