import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { Package } from '@/types'
import { generateId } from '@/utils'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: () => db.packages.toArray(),
  })
}

export function usePackageMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update'; pkg: Partial<Package> }) => {
      const now = new Date().toISOString()
      if (data.action === 'add') {
        const pkg: Package = {
          package_id: generateId(),
          package_name: data.pkg.package_name || '',
          package_type: data.pkg.package_type || 'session',
          session_count: data.pkg.session_count ?? null,
          valid_days: data.pkg.valid_days ?? 30,
          package_price: data.pkg.package_price ?? 0,
          description: data.pkg.description || '',
          active_status: data.pkg.active_status ?? true,
          created_at: now,
          updated_at: now,
        }
        await db.packages.add(pkg)
        return pkg
      }
      await db.packages.update(data.pkg.package_id!, { ...data.pkg, updated_at: now })
    },
    onSuccess: (_, vars) => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['packages'] })
      useToastStore.getState().addToast(vars.action === 'add' ? 'Paket berhasil ditambahkan' : 'Paket berhasil diperbarui', 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan paket', 'error') },
  })
}
