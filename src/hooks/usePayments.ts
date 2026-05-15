import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { MemberPackage, MemberPayment, ProductSale } from '@/types'
import { generateId } from '@/utils'
import { addDays } from 'date-fns'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

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
      const now = new Date().toISOString()
      const newPayment: MemberPayment = { ...payment, payment_id: generateId(), created_at: now }
      await db.memberPayments.add(newPayment)
      const pkg = await db.packages.get(payment.package_id)
      if (pkg) {
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
      }
      return newPayment
    },
    onSuccess: () => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['memberPayments'] })
      qc.invalidateQueries({ queryKey: ['memberPackages'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      useToastStore.getState().addToast('Pembayaran berhasil disimpan', 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan pembayaran', 'error') },
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

export function useProductSaleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sale: Omit<ProductSale, 'transaction_id' | 'created_at'>) => {
      const now = new Date().toISOString()
      const newSale: ProductSale = { ...sale, transaction_id: generateId(), created_at: now }
      await db.productSales.add(newSale)
      for (const item of sale.items) {
        const product = await db.products.get(item.product_id)
        if (product) {
          await db.products.update(item.product_id, { stock: product.stock - item.quantity, updated_at: now })
        }
      }
      return newSale
    },
    onSuccess: () => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['productSales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      useToastStore.getState().addToast('Penjualan berhasil disimpan', 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal menyimpan penjualan', 'error') },
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
