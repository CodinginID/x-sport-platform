import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { Member } from '@/types'
import { generateId } from '@/utils'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

export function useMembers(includeInactive = false) {
  return useQuery({
    queryKey: ['members', { includeInactive }],
    queryFn: async () => {
      const all = await db.members.toArray()
      return includeInactive ? all : all.filter(m => m.status_active)
    },
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => db.members.get(id),
    enabled: !!id,
  })
}

export function useMemberMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'archive'; member: Partial<Member> }) => {
      const now = new Date().toISOString()
      if (data.action === 'add') {
        const member: Member = {
          member_id: generateId(),
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
        }
        await db.members.add(member)
        return member
      }
      if (data.action === 'archive') {
        await db.members.update(data.member.member_id!, { status_active: false, updated_at: now })
      } else {
        await db.members.update(data.member.member_id!, { ...data.member, updated_at: now })
      }
    },
    onSuccess: (_, vars) => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      const msg = vars.action === 'add' ? 'Member berhasil ditambahkan' : vars.action === 'archive' ? 'Member berhasil diarsipkan' : 'Member berhasil diperbarui'
      useToastStore.getState().addToast(msg, 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan member', 'error') },
  })
}
