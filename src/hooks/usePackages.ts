import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Package } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      const { data, error } = await supabase
        .from('packages').select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Package[];
    },
  });
}

export function usePackageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update'; pkg: Partial<Package> }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

      if (data.action === 'add') {
        const pkg: Package & { studio_id: string } = {
          package_id: generateId(),
          studio_id: studioId,
          package_name: data.pkg.package_name || '',
          package_type: data.pkg.package_type || 'session',
          session_count: data.pkg.session_count ?? null,
          valid_days: data.pkg.valid_days ?? 30,
          package_price: data.pkg.package_price ?? 0,
          default_capacity: data.pkg.default_capacity ?? 1,
          description: data.pkg.description || '',
          active_status: data.pkg.active_status ?? true,
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from('packages').insert(pkg);
        if (error) throw new Error(error.message);
        return pkg;
      }

      const { error } = await supabase.from('packages')
        .update({ ...data.pkg, updated_at: now })
        .eq('package_id', data.pkg.package_id!)
        .eq('studio_id', studioId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      useToastStore.getState().addToast(vars.action === 'add' ? 'Paket berhasil ditambahkan' : 'Paket berhasil diperbarui', 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan paket', 'error'); },
  });
}
