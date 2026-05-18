import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/database/db'
import type { Booking, CoachCommission } from '@/types'
import { generateId } from '@/utils'
import { scheduleBackup } from '@/utils/backup'
import { useToastStore } from '@/stores/toast'

export function useBookings(filters?: { date?: string; status?: string; member_id?: string; coach_id?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      let results = await db.bookings.toArray()
      if (filters?.date) results = results.filter(b => b.booking_date === filters.date)
      if (filters?.status) results = results.filter(b => b.booking_status === filters.status)
      if (filters?.member_id) results = results.filter(b => b.member_id === filters.member_id)
      if (filters?.coach_id) results = results.filter(b => b.coach_id === filters.coach_id)
      return results
    },
  })
}

export function useBookingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { action: 'create' | 'attend' | 'cancel'; booking: Partial<Booking> }) => {
      const now = new Date().toISOString()
      if (data.action === 'create') {
        const booking: Booking = {
          booking_id: generateId(),
          booking_date: data.booking.booking_date || now.split('T')[0],
          booking_time: data.booking.booking_time || '',
          member_id: data.booking.member_id || '',
          coach_id: data.booking.coach_id || '',
          package_id: data.booking.package_id || '',
          member_package_id: data.booking.member_package_id || '',
          package_price: data.booking.package_price ?? 0,
          booking_status: 'booked',
          created_at: now,
          updated_at: now,
        }
        await db.bookings.add(booking)
        return booking
      }
      if (data.action === 'cancel') {
        await db.bookings.update(data.booking.booking_id!, { booking_status: 'cancelled', updated_at: now })
        return
      }
      // attend / check-in
      const booking = await db.bookings.get(data.booking.booking_id!)
      if (!booking) throw new Error('Booking not found')

      if (booking.member_package_id) {
        const mp = await db.memberPackages.get(booking.member_package_id)
        if (mp && mp.remaining_sessions > 0) {
          const newRemaining = mp.remaining_sessions - 1
          await db.memberPackages.update(mp.member_package_id, {
            remaining_sessions: newRemaining,
            status: newRemaining <= 0 ? 'depleted' : 'active',
          })
        }
      }

      const coach = await db.coaches.get(booking.coach_id)
      if (coach) {
        const pc = await db.packageCoaches.where({ package_id: booking.package_id, coach_id: booking.coach_id }).first()
        const commissionPct = pc?.commission_percentage ?? 0
        if (commissionPct > 0) {
          const commission: CoachCommission = {
            commission_id: generateId(),
            coach_id: coach.coach_id,
            booking_id: booking.booking_id,
            member_id: booking.member_id,
            package_price: booking.package_price,
            commission_percentage: commissionPct,
            commission_amount: booking.package_price * commissionPct / 100,
            date: booking.booking_date,
            created_at: now,
          }
          await db.coachCommissions.add(commission)
        }
      }
      await db.bookings.update(booking.booking_id, { booking_status: 'attended', updated_at: now })
    },
    onSuccess: (_, vars) => {
      scheduleBackup()
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['memberPackages'] })
      qc.invalidateQueries({ queryKey: ['coachCommissions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      const msg = vars.action === 'create' ? 'Booking berhasil dibuat' : vars.action === 'attend' ? 'Check-in berhasil' : 'Booking dibatalkan'
      useToastStore.getState().addToast(msg, vars.action === 'cancel' ? 'warning' : 'success')
    },
    onError: () => { useToastStore.getState().addToast('Gagal memproses booking', 'error') },
  })
}
