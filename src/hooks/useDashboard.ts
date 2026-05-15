import { useQuery } from '@tanstack/react-query'
import { db } from '@/database/db'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const [allMembers, bookings, payments, sales, products, coaches] = await Promise.all([
        db.members.toArray(),
        db.bookings.toArray(),
        db.memberPayments.toArray(),
        db.productSales.toArray(),
        db.products.toArray(),
        db.coaches.toArray(),
      ])
      const activeMembersCount = allMembers.filter(m => m.status_active).length
      const todayBookings = bookings.filter(b => b.booking_date === today)
      const todayPayments = payments.filter(p => p.payment_date === today)
      const todaySales = sales.filter(s => s.transaction_date === today)
      const todayIncome = todayPayments.reduce((sum, p) => sum + p.amount, 0) + todaySales.reduce((sum, s) => sum + s.total, 0)
      const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0) + sales.reduce((sum, s) => sum + s.total, 0)
      const lowStockProducts = products.filter(p => p.stock < 5 && p.active_status)
      const activeCoaches = coaches.filter(c => c.active_status)
      const totalBookings = bookings.length
      return { activeMembersCount, todayBookings, todayIncome, totalIncome, lowStockProducts, activeCoaches, totalBookings }
    },
  })
}
