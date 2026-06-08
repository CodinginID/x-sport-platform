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
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('studio_id', studioId!)
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

  const addMutation = useMutation({
    mutationFn: async ({ full_name, email, password }: { full_name: string; email: string; password: string }) => {
      if (!studioId) throw new Error('Studio tidak ditemukan');
      const password_hash = await hashPassword(password);
      const { error } = await supabase.from('users').insert({
        studio_id: studioId,
        email: email.trim().toLowerCase(),
        password_hash,
        full_name: full_name.trim(),
        role: 'staff',
      });
      if (error) {
        if (error.code === '23505') throw new Error('Email sudah terdaftar di studio ini');
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, full_name, newPassword }: { id: string; full_name?: string; newPassword?: string }) => {
      const updates: Record<string, string> = {};
      if (full_name) updates.full_name = full_name.trim();
      if (newPassword) updates.password_hash = await hashPassword(newPassword);
      if (!Object.keys(updates).length) return;
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (staff: StaffUser) => {
      if (!studioId) throw new Error('Studio tidak ditemukan');
      // Logout the staff from all devices first
      await supabase.from('sessions').delete()
        .eq('studio_id', studioId)
        .eq('user_email', staff.email);
      const { error } = await supabase.from('users').delete().eq('id', staff.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addMutation, updateMutation, deleteMutation };
}
