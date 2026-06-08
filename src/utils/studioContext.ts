import { getStoredLicense } from '@/services/license';

/** Returns the studio_id (= license.id) for the active license, or null in demo mode. */
export function getStudioId(): string | null {
  return getStoredLicense()?.id ?? null;
}

/** Like getStudioId() but throws if there's no active studio — use inside mutations. */
export function requireStudioId(): string {
  const id = getStudioId();
  if (!id) throw new Error('No active studio — please activate your license first.');
  return id;
}
