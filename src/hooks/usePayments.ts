import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { MemberPackage, MemberPayment, ProductSale, ProductSaleItem } from '@/types'
import { generateId } from '@/utils'
import { addDays } from 'date-fns'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'
import { productSaleSchema, memberPaymentSchema } from '@/utils/schemas'

export function useMemberPackages(member_id?: string) {
  return useQuery({
    queryKey: ['memberPackages', member_id],
    queryFn: async () => {
      if (member_id) return db.memberPackages.where('member_id').equals(member_id).toArray()
      return db.memberPackages.toArray()
    },
  })
}

export function useMemberPayments(filters?: { member_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['memberPayments', filters],
    queryFn: async () => {
      let results = await db.memberPayments.toArray()
      if (filters?.member_id) results = results.filter(p => p.member_id === filters.member_id)
      if (filters?.startDate) results = results.filter(p => p.payment_date >= filters.startDate!)
      if (filters?.endDate) results = results.filter(p => p.payment_date <= filters.endDate!)
      return results
    },
  })
}

export function useMemberPaymentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<MemberPayment, 'payment_id' | 'created_at'>) => {
      // Validate input shape + cross-field rules before touching the DB.
      const parsed = memberPaymentSchema.safeParse(payment)
      if (!parsed.success) {
        const first = parsed.error.issues[0]
        throw new Error(first?.message ?? 'Data pembayaran tidak valid')
      }

      const now = new Date().toISOString()
      const newPayment: MemberPayment = { ...payment, payment_id: generateId(), created_at: now }

      // Atomic: payment + auto-create memberPackage in one transaction so a
      // crash mid-write can never leave a payment without its memberPackage.
      return await db.transaction('rw', [db.memberPayments, db.memberPackages, db.packages], async () => {
        const pkg = await db.packages.get(payment.package_id)
        if (!pkg) throw new Error('Paket tidak ditemukan')

        await db.memberPayments.add(newPayment)

        const mp: MemberPackage = {
          member_package_id: generateId(),
          member_id: payment.member_id,
          package_id: payment.package_id,
          purchase_date: payment.payment_date,
          expired_date: addDays(new Date(payment.payment_date), pkg.valid_days).toISOString().split('T')[0],
          total_sessions: pkg.session_count ?? 0,
          remaining_sessions: pkg.session_count ?? 0,
          status: 'active',
          created_at: now,
        }
        await db.memberPackages.add(mp)
        return newPayment
      })
    },
    onSuccess: () => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['memberPayments'] })
      qc.invalidateQueries({ queryKey: ['memberPackages'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      useToastStore.getState().addToast('Pembayaran berhasil disimpan', 'success')
    },
    onError: (e: Error) => {
      useToastStore.getState().addToast(e.message || 'Gagal menyimpan pembayaran', 'error')
    },
  })
}

export function useProductSales(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['productSales', filters],
    queryFn: async () => {
      let results = await db.productSales.toArray()
      if (filters?.startDate) results = results.filter(s => s.transaction_date >= filters.startDate!)
      if (filters?.endDate) results = results.filter(s => s.transaction_date <= filters.endDate!)
      return results
    },
  })
}

/**
 * Merge sale lines that reference the same product_id into one. The caller
 * may add the same product as separate rows in the form; we collapse them so
 * stock decrement, total, and the printed receipt all stay consistent.
 */
function mergeSaleItems(items: ProductSaleItem[]): ProductSaleItem[] {
  const map = new Map<string, ProductSaleItem>()
  for (const item of items) {
    const existing = map.get(item.product_id)
    if (existing) {
      const quantity = existing.quantity + item.quantity
      map.set(item.product_id, {
        ...existing,
        quantity,
        subtotal: existing.unit_price * quantity,
      })
    } else {
      map.set(item.product_id, { ...item })
    }
  }
  return Array.from(map.values())
}

export function useProductSaleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ProductSale, 'transaction_id' | 'created_at'>) => {
      // 1. Dedupe items first so all downstream math + validation operates on
      //    the canonical (one row per product) shape.
      const mergedItems = mergeSaleItems(input.items)
      const subtotal = mergedItems.reduce((sum, i) => sum + i.subtotal, 0)
      const discount = Math.max(0, input.discount ?? 0)
      const total = Math.max(0, subtotal - discount)
      const cashReceived = input.payment_method === 'cash' ? (input.cash_received ?? 0) : total
      const change = input.payment_method === 'cash' ? Math.max(0, cashReceived - total) : 0

      const sale: Omit<ProductSale, 'transaction_id' | 'created_at'> = {
        ...input,
        items: mergedItems,
        subtotal,
        discount,
        total,
        cash_received: cashReceived,
        change,
      }

      // 2. Schema validation (cross-field: discount<=subtotal, total math,
      //    cash_received>=total when method is cash).
      const parsed = productSaleSchema.safeParse(sale)
      if (!parsed.success) {
        const first = parsed.error.issues[0]
        throw new Error(first?.message ?? 'Data penjualan tidak valid')
      }

      const now = new Date().toISOString()
      const newSale: ProductSale = { ...sale, transaction_id: generateId(), created_at: now }

      // 3. Atomic: validate stock + write sale + decrement all stock counts in
      //    a single read-write transaction. Dexie serializes operations on the
      //    same object stores so the read-modify-write on `products` is safe
      //    against concurrent sales of the same item.
      return await db.transaction('rw', [db.productSales, db.products], async () => {
        // Pre-flight: load every referenced product and verify stock first so
        // we throw before writing anything.
        const productMap = new Map<string, { stock: number; name: string }>()
        for (const item of newSale.items) {
          const product = await db.products.get(item.product_id)
          if (!product) {
            throw new Error(`Produk "${item.product_name}" tidak ditemukan`)
          }
          if (product.stock < item.quantity) {
            throw new Error(
              `Stok "${product.product_name}" tidak cukup (tersedia ${product.stock}, diminta ${item.quantity})`
            )
          }
          productMap.set(item.product_id, { stock: product.stock, name: product.product_name })
        }

        await db.productSales.add(newSale)

        for (const item of newSale.items) {
          const cached = productMap.get(item.product_id)!
          await db.products.update(item.product_id, {
            stock: cached.stock - item.quantity,
            updated_at: now,
          })
        }

        return newSale
      })
    },
    onSuccess: () => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['productSales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      useToastStore.getState().addToast('Penjualan berhasil disimpan', 'success')
    },
    onError: (e: Error) => {
      useToastStore.getState().addToast(e.message || 'Gagal menyimpan penjualan', 'error')
    },
  })
}

export function useCoachCommissions(filters?: { coach_id?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['coachCommissions', filters],
    queryFn: async () => {
      let results = await db.coachCommissions.toArray()
      if (filters?.coach_id) results = results.filter(c => c.coach_id === filters.coach_id)
      if (filters?.startDate) results = results.filter(c => c.date >= filters.startDate!)
      if (filters?.endDate) results = results.filter(c => c.date <= filters.endDate!)
      return results
    },
  })
}
