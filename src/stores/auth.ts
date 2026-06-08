import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/utils';
import type { LicenseInfo } from '@/types';
import { getSessionCookie, setSessionCookie, deleteSessionCookie } from '@/utils/cookie';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'staff' | 'superadmin';
}

interface AuthState {
  user: AuthUser | null;
  studioId: string | null;
  licenseInfo: LicenseInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(email: string, password: string, rememberMe: boolean): Promise<boolean>;
  logout(): Promise<void>;
  validateSession(): Promise<void>;
  updateLicenseInfo(license: LicenseInfo): Promise<void>;
}

async function lookupUser(email: string) {
  // 1. Try license_users — fetch ALL rows for this email, pick most recent
  //    (.maybeSingle() silently returns null when there are multiple rows)
  const { data: luList } = await supabase.from('license_users')
    .select('email, password_hash, full_name, role, license_id')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (luList?.length) {
    const lu = luList[0];
    return { ...lu, source: 'license_users' as const, studioId: lu.license_id };
  }

  // 2. Username prefix match in license_users
  const { data: allLu } = await supabase.from('license_users')
    .select('email, password_hash, full_name, role, license_id')
    .ilike('email', `${email}@%`)
    .order('created_at', { ascending: false });
  const luMatch = (allLu ?? []).find(u => u.email.split('@')[0] === email);
  if (luMatch) return { ...luMatch, source: 'license_users' as const, studioId: luMatch.license_id };

  // 3. Try users table (staff added after activation)
  const { data: uList } = await supabase.from('users')
    .select('id, email, password_hash, full_name, role, studio_id')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);
  const u = uList?.[0];
  if (u) return { ...u, source: 'users' as const, studioId: u.studio_id };

  return null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  studioId: null,
  licenseInfo: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password, rememberMe) => {
    // Superadmin from env
    const adminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL as string | undefined;
    const adminPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD as string | undefined;
    if (adminEmail && adminPassword) {
      const matchEmail = email === adminEmail || email === adminEmail.split('@')[0];
      if (matchEmail && password === adminPassword) {
        set({ user: { id: 'superadmin', email: adminEmail, full_name: 'Super Admin', role: 'superadmin' }, studioId: null, licenseInfo: null, isAuthenticated: true });
        return true;
      }
    }

    const found = await lookupUser(email.trim());
    if (!found) return false;
    if (!(await verifyPassword(password, found.password_hash))) return false;

    // Fetch license
    const { data: license } = await supabase.from('licenses')
      .select('*').eq('id', found.studioId).single();
    if (!license || !license.is_active) return false;

    // Enforce 1-device-per-license: revoke all existing sessions before creating new one.
    // The other device will be logged out on its next page load (validateSession finds nothing).
    await supabase.from('sessions').delete().eq('studio_id', found.studioId);

    // Create session in Supabase
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 86_400_000).toISOString();
    const { data: session, error: sessErr } = await supabase.from('sessions').insert({
      studio_id: found.studioId,
      user_db_id: found.source === 'users' ? (found as any).id : found.email,
      user_email: found.email,
      user_full_name: found.full_name,
      user_role: found.role,
      license_data: license,
      remember_me: rememberMe,
      expires_at: expiresAt,
    }).select('id').single();

    if (sessErr || !session) return false;

    setSessionCookie(session.id, rememberMe ? 30 : null);

    set({
      user: { id: found.source === 'users' ? (found as any).id : found.email, email: found.email, full_name: found.full_name, role: found.role as 'owner' | 'staff' },
      studioId: found.studioId,
      licenseInfo: license as LicenseInfo,
      isAuthenticated: true,
    });
    return true;
  },

  logout: async () => {
    const sessionId = getSessionCookie();
    if (sessionId) {
      await supabase.from('sessions').delete().eq('id', sessionId);
      deleteSessionCookie();
    }
    set({ user: null, studioId: null, licenseInfo: null, isAuthenticated: false });
  },

  validateSession: async () => {
    set({ isLoading: true });
    const sessionId = getSessionCookie();
    if (!sessionId) { set({ isLoading: false }); return; }

    const { data: session } = await supabase.from('sessions')
      .select('*').eq('id', sessionId).maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      deleteSessionCookie();
      set({ isLoading: false });
      return;
    }

    // Refresh last_used_at and fetch latest license
    const { data: license } = await supabase.from('licenses')
      .select('*').eq('id', session.studio_id).single();

    await supabase.from('sessions')
      .update({ last_used_at: new Date().toISOString(), license_data: license ?? session.license_data })
      .eq('id', sessionId);

    set({
      user: { id: session.user_db_id, email: session.user_email, full_name: session.user_full_name, role: session.user_role as 'owner' | 'staff' },
      studioId: session.studio_id,
      licenseInfo: (license ?? session.license_data) as LicenseInfo,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateLicenseInfo: async (license) => {
    const sessionId = getSessionCookie();
    if (sessionId) {
      await supabase.from('sessions')
        .update({ license_data: license, last_used_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
    set({ licenseInfo: license });
  },
}));
