import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';
import type { TrainingSession, Booking } from '@/types';

export interface SlotInfo { filled: number; capacity: number; isFull: boolean; }

/** Hitung status slot sesi. "Penuh" diturunkan, tidak disimpan. */
export function slotInfo(filled: number, capacity: number): SlotInfo {
  return { filled, capacity, isFull: filled >= capacity };
}

/**
 * Sesi pada rentang tanggal (periode). `start`/`end` inklusif (format 'YYYY-MM-DD').
 * Bila keduanya kosong → semua sesi. Diurut tanggal lalu jam.
 */
export function useTrainingSessions(start?: string, end?: string) {
  return useQuery({
    queryKey: ['trainingSessions', start, end],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      let q = supabase.from('training_sessions').select('*')
        .eq('studio_id', studioId).eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true });
      if (start) q = q.gte('session_date', start);
      if (end) q = q.lte('session_date', end);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as TrainingSession[];
    },
  });
}

/** Peserta (bookings) di sebuah sesi. */
export function useSessionParticipants(trainingSessionId?: string) {
  return useQuery({
    queryKey: ['sessionParticipants', trainingSessionId],
    enabled: !!trainingSessionId,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId || !trainingSessionId) return [];
      const { data, error } = await supabase.from('bookings').select('*')
        .eq('studio_id', studioId)
        .eq('training_session_id', trainingSessionId)
        .neq('booking_status', 'cancelled')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Booking[];
    },
  });
}

/** Jumlah peserta non-cancelled per sesi (untuk badge slot). */
export function useSessionCounts(sessionIds: string[]) {
  const key = [...sessionIds].sort().join(',');
  const { data } = useQuery({
    queryKey: ['sessionCounts', key],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId || sessionIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase.from('bookings')
        .select('training_session_id')
        .eq('studio_id', studioId)
        .neq('booking_status', 'cancelled')
        .in('training_session_id', sessionIds);
      if (error) throw new Error(error.message);
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { training_session_id: string }[]) {
        map[row.training_session_id] = (map[row.training_session_id] ?? 0) + 1;
      }
      return map;
    },
  });
  return data ?? {};
}

/** Buat atau batalkan sesi. */
export function useTrainingSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data:
      | { action: 'create'; session: Pick<TrainingSession, 'session_date' | 'session_time' | 'capacity' | 'coach_id' | 'session_category'> }
      | { action: 'update'; training_session_id: string; coach_id: string | null }
      | { action: 'cancel'; training_session_id: string }
    ) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();
      if (data.action === 'create') {
        const row = {
          training_session_id: generateId(), studio_id: studioId,
          ...data.session, status: 'scheduled' as const, created_at: now, updated_at: now,
        };
        const { error } = await supabase.from('training_sessions').insert(row);
        if (error) throw new Error(error.message);
        return row;
      }
      if (data.action === 'update') {
        // edit sesi — saat ini hanya assign/ganti coach
        const { error } = await supabase.from('training_sessions')
          .update({ coach_id: data.coach_id, updated_at: now })
          .eq('training_session_id', data.training_session_id).eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }
      // cancel: batalkan sesi + semua peserta booked
      const { error: e1 } = await supabase.from('training_sessions')
        .update({ status: 'cancelled', updated_at: now })
        .eq('training_session_id', data.training_session_id).eq('studio_id', studioId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase.from('bookings')
        .update({ booking_status: 'cancelled', updated_at: now })
        .eq('training_session_id', data.training_session_id).eq('studio_id', studioId)
        .eq('booking_status', 'booked');
      if (e2) throw new Error(e2.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['trainingSessions'] });
      qc.invalidateQueries({ queryKey: ['sessionParticipants'] });
      qc.invalidateQueries({ queryKey: ['sessionCounts'] });
      const msg = vars.action === 'create' ? 'Sesi dibuat' : vars.action === 'update' ? 'Coach sesi diperbarui' : 'Sesi dibatalkan';
      useToastStore.getState().addToast(msg, vars.action === 'cancel' ? 'warning' : 'success');
    },
    onError: (e: Error) => useToastStore.getState().addToast(e.message || 'Gagal memproses sesi', 'error'),
  });
}

/** Daftarkan member ke sesi via RPC atomik. */
export function useRegisterParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      training_session_id: string;
      member_id: string;
      member_package_id: string;
      price: number;
    }) => {
      const studioId = requireStudioId();
      const { error } = await supabase.rpc('register_session_participant', {
        p_training_session_id: vars.training_session_id,
        p_member_id: vars.member_id,
        p_member_package_id: vars.member_package_id,
        p_price: vars.price,
        p_studio_id: studioId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionParticipants'] });
      qc.invalidateQueries({ queryKey: ['sessionCounts'] });
      qc.invalidateQueries({ queryKey: ['trainingSessions'] });
      useToastStore.getState().addToast('Member terdaftar di sesi', 'success');
    },
    onError: (e: Error) => useToastStore.getState().addToast(e.message || 'Gagal mendaftarkan member', 'error'),
  });
}
