import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/database/db';
import { verifyPassword } from '@/utils';

interface AuthState {
  user: null | { id: string; email: string; full_name: string; role: 'owner' | 'staff' };
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      login: async (email, password, rememberMe) => {
        const user = await db.users.where('email').equals(email).first();
        if (!user) return false;
        if (!verifyPassword(password, user.password_hash)) return false;
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
      partialize: (state) =>
        state.rememberMe
          ? { user: state.user, isAuthenticated: state.isAuthenticated, rememberMe: state.rememberMe }
          : ({} as any),
    }
  )
);
