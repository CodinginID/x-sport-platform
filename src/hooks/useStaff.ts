import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { hashPassword } from '@/utils';

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export function useStaff() {
  const studioId = useAuthStore(s => s.studioId);
  return useQuery({
    queryKey: ['staff', studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_users')
        .select('id, email, full_name, role, created_at')
        .eq('license_id', studioId!)
        .order('role')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as StaffUser[];
    },
  });
}

export function useStaffMutation() {
  const qc = useQueryClient();
  const studioId = useAuthStore(s => s.studioId);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff', studioId] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, email, full_name, newPassword }: { id: string; email: string; full_name?: string; newPassword?: string }) => {
      const updates: Record<string, string> = {};
      if (full_name) updates.full_name = full_name.trim();
      if (newPassword) updates.password_hash = await hashPassword(newPassword);
      if (!Object.keys(updates).length) return;

      // Update license_users (source of truth for auth)
      const { error } = await supabase.from('license_users').update(updates).eq('id', id);
      if (error) throw error;

      // Sync to users table best-effort (for login via users path)
      if (studioId) {
        await supabase.from('users').update(updates)
          .eq('studio_id', studioId)
          .eq('email', email);
      }
    },
    onSuccess: invalidate,
  });

  return { updateMutation };
}
