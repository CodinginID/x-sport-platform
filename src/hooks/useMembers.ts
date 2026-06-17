import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Member } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function useMembers(includeInactive = false) {
  return useQuery({
    queryKey: ['members', { includeInactive }],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('members').select('*').eq('studio_id', studioId).order('created_at', { ascending: false });
      if (!includeInactive) q = q.eq('status_active', true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Member[];
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId || !id) return null;
      const { data, error } = await supabase
        .from('members').select('*')
        .eq('member_id', id).eq('studio_id', studioId)
        .single();
      if (error) throw new Error(error.message);
      return data as Member;
    },
    enabled: !!id,
  });
}

export function useMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'archive' | 'delete'; member: Partial<Member> }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

      if (data.action === 'add') {
        const member: Member & { studio_id: string } = {
          member_id: generateId(),
          studio_id: studioId,
          full_name: data.member.full_name || '',
          phone_number: data.member.phone_number || '',
          email: data.member.email || '',
          gender: data.member.gender || 'other',
          birth_date: data.member.birth_date || '',
          address: data.member.address || '',
          join_date: now.split('T')[0],
          status_active: true,
          notes: data.member.notes || '',
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from('members').insert(member);
        if (error) throw new Error(error.message);
        return member;
      }

      if (data.action === 'delete') {
        const memberId = data.member.member_id!;
        // Urutan: hapus semua data terkait dulu sebelum member (CASCADE juga ada di DB, ini defensive)
        const related: Array<[string, Record<string, string>]> = [
          ['coach_commissions', { member_id: memberId, studio_id: studioId }],
          ['member_payments',   { member_id: memberId, studio_id: studioId }],
          ['bookings',          { member_id: memberId, studio_id: studioId }],
          ['member_packages',   { member_id: memberId, studio_id: studioId }],
        ];
        for (const [table, match] of related) {
          const { error: e } = await (supabase.from(table as any).delete() as any).match(match);
          if (e) throw new Error(`Gagal hapus ${table}: ${e.message}`);
        }
        const { error } = await supabase.from('members').delete().eq('member_id', memberId).eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      if (data.action === 'archive') {
        const { error } = await supabase.from('members')
          .update({ status_active: false, updated_at: now })
          .eq('member_id', data.member.member_id!)
          .eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase.from('members')
        .update({ ...data.member, updated_at: now })
        .eq('member_id', data.member.member_id!)
        .eq('studio_id', studioId);
      if (error) throw new Error(error.message);
    },
    onMutate: (vars) => {
      if (vars.action === 'delete') {
        useToastStore.getState().addToast('Menghapus data member dan riwayatnya...', 'info');
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (vars.action === 'delete') {
        qc.invalidateQueries({ queryKey: ['bookings'] });
        qc.invalidateQueries({ queryKey: ['memberPackages'] });
      }
      const msg = vars.action === 'add' ? 'Member berhasil ditambahkan' : vars.action === 'archive' ? 'Member berhasil diarsipkan' : vars.action === 'delete' ? 'Member berhasil dihapus' : 'Member berhasil diperbarui';
      useToastStore.getState().addToast(msg, vars.action === 'delete' ? 'warning' : 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan member', 'error'); },
  });
}
