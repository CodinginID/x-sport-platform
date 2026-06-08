import { useAuthStore } from '@/stores/auth';

export function getStudioId(): string | null {
  return useAuthStore.getState().studioId;
}

export function requireStudioId(): string {
  const id = getStudioId();
  if (!id) throw new Error('No active studio — please activate your license first.');
  return id;
}
