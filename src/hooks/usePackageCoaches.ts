import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { PackageCoach } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function usePackageCoaches(package_id?: string) {
  return useQuery({
    queryKey: ['packageCoaches', package_id],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('package_coaches').select('*').eq('studio_id', studioId);
      if (package_id) q = q.eq('package_id', package_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as PackageCoach[];
    },
  });
}

export function usePackageCoachMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: 'add' | 'remove'; package_id: string; coach_id: string; commission_percentage?: number }) => {
      const studioId = requireStudioId();

      if (input.action === 'add') {
        // Check if already exists
        const { data: existing } = await supabase
          .from('package_coaches').select('package_coach_id')
          .eq('package_id', input.package_id)
          .eq('coach_id', input.coach_id)
          .eq('studio_id', studioId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from('package_coaches')
            .update({ commission_percentage: input.commission_percentage ?? 0 })
            .eq('package_coach_id', existing.package_coach_id);
          if (error) throw new Error(error.message);
          return;
        }

        const entry: PackageCoach & { studio_id: string } = {
          package_coach_id: generateId(),
          studio_id: studioId,
          package_id: input.package_id,
          coach_id: input.coach_id,
          commission_percentage: input.commission_percentage ?? 0,
          created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('package_coaches').insert(entry);
        if (error) throw new Error(error.message);
        return;
      }

      // remove
      const { error } = await supabase.from('package_coaches')
        .delete()
        .eq('package_id', input.package_id)
        .eq('coach_id', input.coach_id)
        .eq('studio_id', studioId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packageCoaches'] });
    },
    onError: (e: Error) => {
      useToastStore.getState().addToast(e.message || 'Gagal menyimpan coach paket', 'error');
    },
  });
}
