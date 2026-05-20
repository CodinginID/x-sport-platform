import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/database/db';
import { verifyPassword } from '@/utils';

interface AuthState {
  user: null | { id: string; email: string; full_name: string; role: 'owner' | 'staff' | 'superadmin' };
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      login: async (identifier, password, rememberMe) => {
        // Check superadmin credentials from env vars first
        const adminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL as string | undefined;
        const adminPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD as string | undefined;
        if (adminEmail && adminPassword) {
          const matchEmail = identifier === adminEmail || identifier === adminEmail.split('@')[0];
          if (matchEmail && password === adminPassword) {
            set({
              user: { id: 'superadmin', email: adminEmail, full_name: 'Super Admin', role: 'superadmin' },
              isAuthenticated: true,
              rememberMe,
            });
            return true;
          }
        }

        // Normal IndexedDB check
        let user = await db.users.where('email').equals(identifier).first();
        if (!user) {
          const allUsers = await db.users.toArray();
          user = allUsers.find(u => u.email.split('@')[0] === identifier);
        }
        if (!user) return false;
        if (!(await verifyPassword(password, user.password_hash))) return false;
        set({
          user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
          isAuthenticated: true,
          rememberMe,
        });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false, rememberMe: false }),
    }),
    {
      name: 'xsport-auth',
    }
  )
);
