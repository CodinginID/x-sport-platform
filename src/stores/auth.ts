import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/database/db';
import { verifyPassword } from '@/utils';

interface AuthState {
  user: null | { id: string; email: string; full_name: string; role: 'owner' | 'staff' };
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
        // Support login by email or username (part before @)
        let user = await db.users.where('email').equals(identifier).first();
        if (!user) {
          // Try matching by username prefix (e.g. "admin" matches "admin@studio.com")
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
