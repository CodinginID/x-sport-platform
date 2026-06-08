import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/utils';
import { getStoredLicense } from '@/services/license';

interface AuthState {
  user: null | { id: string; email: string; full_name: string; role: 'owner' | 'staff' | 'superadmin' };
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}

async function findUser(identifier: string, studioId: string) {
  // Exact email match
  const { data: exact } = await supabase
    .from('users')
    .select('id, email, password_hash, full_name, role')
    .eq('studio_id', studioId)
    .eq('email', identifier)
    .maybeSingle();
  if (exact) return exact;

  // Username prefix match
  const { data: all } = await supabase
    .from('users')
    .select('id, email, password_hash, full_name, role')
    .eq('studio_id', studioId);
  return (all ?? []).find(u => u.email.split('@')[0] === identifier) ?? null;
}

async function findLicenseUser(identifier: string, licenseId: string) {
  const { data: exact } = await supabase
    .from('license_users')
    .select('email, password_hash, full_name, role')
    .eq('license_id', licenseId)
    .eq('email', identifier)
    .maybeSingle();
  if (exact) return exact;

  const { data: all } = await supabase
    .from('license_users')
    .select('email, password_hash, full_name, role')
    .eq('license_id', licenseId);
  return (all ?? []).find(u => u.email.split('@')[0] === identifier) ?? null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      login: async (identifier, password, rememberMe) => {
        // Superadmin from env
        const adminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL as string | undefined;
        const adminPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD as string | undefined;
        if (adminEmail && adminPassword) {
          const match = identifier === adminEmail || identifier === adminEmail.split('@')[0];
          if (match && password === adminPassword) {
            set({ user: { id: 'superadmin', email: adminEmail, full_name: 'Super Admin', role: 'superadmin' }, isAuthenticated: true, rememberMe });
            return true;
          }
        }

        const studioId = getStoredLicense()?.id;
        if (!studioId) return false;

        // Try activated users table first
        const user = await findUser(identifier, studioId);
        if (user && await verifyPassword(password, user.password_hash)) {
          set({
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role as 'owner' | 'staff' },
            isAuthenticated: true,
            rememberMe,
          });
          return true;
        }

        // Fallback to license_users (pre-activation, pending approval)
        const lu = await findLicenseUser(identifier, studioId);
        if (lu && await verifyPassword(password, lu.password_hash)) {
          set({
            user: { id: `pending:${studioId}:${lu.email}`, email: lu.email, full_name: lu.full_name, role: lu.role as 'owner' | 'staff' },
            isAuthenticated: true,
            rememberMe,
          });
          return true;
        }

        return false;
      },
      logout: () => set({ user: null, isAuthenticated: false, rememberMe: false }),
    }),
    { name: 'xsport-auth' }
  )
);
