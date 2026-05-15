import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { Product } from '@/types'
import { generateId } from '@/utils'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  })
}

export function useProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'adjust_stock'; product: Partial<Product>; adjustment?: number }) => {
      const now = new Date().toISOString()
      if (data.action === 'add') {
        const product: Product = {
          product_id: generateId(),
          product_name: data.product.product_name || '',
          category: data.product.category || '',
          stock: data.product.stock ?? 0,
          unit: data.product.unit || 'pcs',
          selling_price: data.product.selling_price ?? 0,
          cost_price: data.product.cost_price ?? 0,
          active_status: data.product.active_status ?? true,
          created_at: now,
          updated_at: now,
        }
        await db.products.add(product)
        return product
      }
      if (data.action === 'adjust_stock') {
        const existing = await db.products.get(data.product.product_id!)
        if (existing) {
          await db.products.update(data.product.product_id!, { stock: existing.stock + (data.adjustment ?? 0), updated_at: now })
        }
      } else {
        await db.products.update(data.product.product_id!, { ...data.product, updated_at: now })
      }
    },
    onSuccess: (_, vars) => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      const msg = vars.action === 'add' ? 'Produk berhasil ditambahkan' : vars.action === 'adjust_stock' ? 'Stok berhasil disesuaikan' : 'Produk berhasil diperbarui'
      useToastStore.getState().addToast(msg, 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan produk', 'error') },
  })
}
