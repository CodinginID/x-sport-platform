import type { FeatureEntry } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface License {
  id: string;
  license_key: string;
  studio_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan: string | null;
  created_at: string;
  expires_at: string;
  activated_at: string | null;
  is_active: boolean;
  disabled_at: string | null;
  storage_quota_mb: number;
  storage_used_mb: number;
  features?: Record<string, FeatureEntry>;
}

// 3 distinct states for a license:
// 'pending'  — is_active=false, disabled_at=null  → waiting for admin approval
// 'active'   — is_active=true                     → approved and in use
// 'disabled' — is_active=false, disabled_at!=null → manually disabled by superadmin
export type LicenseState = 'pending' | 'active' | 'disabled';

export function getLicenseState(lic: License): LicenseState {
  if (lic.is_active) return 'active';
  if (lic.disabled_at) return 'disabled';
  return 'pending';
}

export interface SessionRow {
  studio_id: string;
  last_used_at: string;
  expires_at: string;
  user_email: string;
  user_full_name: string;
}

export type SessionStatus = 'online' | 'today' | 'recent' | 'idle' | 'none';

export interface LicenseRow extends License {
  sessionStatus: SessionStatus;
  sessionLastUsed: string | null;
  sessionUser: string | null;
  sessionCount: number;
  state: LicenseState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function getSessionStatus(lastUsed: string | null, sessionExpires: string | null): SessionStatus {
  if (!lastUsed || !sessionExpires) return 'none';
  if (new Date(sessionExpires) < new Date()) return 'idle';
  const minAgo = (Date.now() - new Date(lastUsed).getTime()) / 60_000;
  if (minAgo < 30) return 'online';
  if (minAgo < 60 * 24) return 'today';
  if (minAgo < 60 * 24 * 7) return 'recent';
  return 'idle';
}

export const SESSION_CONFIG: Record<SessionStatus, { label: string; dot: string; text: string }> = {
  online: { label: 'Online',        dot: 'bg-green-500 animate-pulse', text: 'text-green-600' },
  today:  { label: 'Aktif hari ini',dot: 'bg-amber-400',               text: 'text-amber-600' },
  recent: { label: 'Aktif minggu ini', dot: 'bg-blue-400',             text: 'text-blue-600'  },
  idle:   { label: 'Tidak aktif',   dot: 'bg-zen-ink/20',              text: 'text-zen-ink/40' },
  none:   { label: 'Belum login',   dot: 'bg-zen-ink/10',              text: 'text-zen-ink/30' },
};
