import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { Coach } from '@/types'
import { generateId } from '@/utils'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: () => db.coaches.toArray(),
  })
}

export function useCoachMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update'; coach: Partial<Coach> }) => {
      const now = new Date().toISOString()
      if (data.action === 'add') {
        const coach: Coach = {
          coach_id: generateId(),
          full_name: data.coach.full_name || '',
          phone_number: data.coach.phone_number || '',
          email: data.coach.email || '',
          active_status: data.coach.active_status ?? true,
          notes: data.coach.notes || '',
          created_at: now,
          updated_at: now,
        }
        await db.coaches.add(coach)
        return coach
      }
      await db.coaches.update(data.coach.coach_id!, { ...data.coach, updated_at: now })
    },
    onSuccess: (_, vars) => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['coaches'] })
      useToastStore.getState().addToast(vars.action === 'add' ? 'Coach berhasil ditambahkan' : 'Coach berhasil diperbarui', 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan coach', 'error') },
  })
}
