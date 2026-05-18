import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/database/db';
import type { PackageCoach } from '@/types';
import { generateId } from '@/utils';

export function usePackageCoaches(package_id?: string) {
  return useQuery({
    queryKey: ['packageCoaches', package_id],
    queryFn: async () => {
      if (package_id) return db.packageCoaches.where('package_id').equals(package_id).toArray();
      return db.packageCoaches.toArray();
    },
  });
}

export function usePackageCoachMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: 'add' | 'remove'; package_id: string; coach_id: string; commission_percentage?: number }) => {
      if (input.action === 'add') {
        const existing = await db.packageCoaches.where({ package_id: input.package_id, coach_id: input.coach_id }).first();
        if (existing) {
          await db.packageCoaches.update(existing.package_coach_id, { commission_percentage: input.commission_percentage });
          return;
        }
        const entry: PackageCoach = {
          package_coach_id: generateId(),
          package_id: input.package_id,
          coach_id: input.coach_id,
          commission_percentage: input.commission_percentage ?? 0,
          created_at: new Date().toISOString(),
        };
        await db.packageCoaches.add(entry);
      } else {
        await db.packageCoaches.where({ package_id: input.package_id, coach_id: input.coach_id }).delete();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packageCoaches'] });
    },
  });
}
