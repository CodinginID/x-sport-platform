import { supabase } from '@/lib/supabase';
import { getDeviceFingerprint } from '@/utils/fingerprint';
import { db } from '@/database/db';

export interface LicenseInfo {
  id: string;
  license_key: string;
  studio_name: string | null;
  studio_address: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan: string;
  storage_quota_mb: number;
  storage_used_mb: number;
  expires_at: string;
  grace_period_days: number;
  activated_at: string | null;
  device_fingerprint: string | null;
  last_validated_at: string | null;
  is_active: boolean;
}

interface LicenseUser {
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
}

export interface ActivationData {
  licenseKey: string;
  studioName: string;
  studioAddress: string;
  ownerEmail: string;
  ownerPhone?: string;
}

export type LicenseResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const LICENSE_STORAGE_KEY = 'xsport-license';

// Local license cache in localStorage
export function getStoredLicense(): (LicenseInfo & { validatedAt: string }) | null {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeLicense(license: LicenseInfo) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({ ...license, validatedAt: new Date().toISOString() }));
}

export function clearStoredLicense() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

// Check if app is activated
export function isActivated(): boolean {
  return getStoredLicense()?.activated_at != null;
}

// Check if license is within grace period (offline tolerance)
export function isWithinGracePeriod(): boolean {
  const license = getStoredLicense();
  if (!license) return false;
  const graceDays = license.grace_period_days || 30;
  const lastValidated = new Date(license.validatedAt).getTime();
  const now = Date.now();
  return (now - lastValidated) < graceDays * 24 * 60 * 60 * 1000;
}

// Check if license is expired
export function isLicenseExpired(): boolean {
  const license = getStoredLicense();
  if (!license) return true;
  return new Date(license.expires_at).getTime() < Date.now();
}

// Validate license status (call when online)
export async function validateLicense(): Promise<LicenseResult<LicenseInfo>> {
  const stored = getStoredLicense();
  if (!stored) return { ok: false, error: 'Belum aktivasi' };

  const fingerprint = await getDeviceFingerprint();

  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', stored.license_key)
    .eq('is_active', true)
    .single();

  if (error || !data) return { ok: false, error: 'Lisensi tidak valid atau sudah dinonaktifkan' };
  if (data.device_fingerprint && data.device_fingerprint !== fingerprint) {
    return { ok: false, error: 'Lisensi sudah digunakan di perangkat lain' };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Lisensi sudah expired' };
  }

  // Update last_validated_at
  await supabase.from('licenses').update({ last_validated_at: new Date().toISOString() }).eq('id', data.id);

  storeLicense(data as LicenseInfo);
  return { ok: true, data: data as LicenseInfo };
}

// Activate license (first time)
export async function activateLicense(activation: ActivationData): Promise<LicenseResult> {
  const fingerprint = await getDeviceFingerprint();

  // 1. Validate license key exists and is not yet activated
  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', activation.licenseKey)
    .single();

  if (error || !license) return { ok: false, error: 'License key tidak ditemukan' };
  if (!license.is_active) return { ok: false, error: 'License key belum disetujui admin. Hubungi developer.' };
  if (license.activated_at) {
    if (license.device_fingerprint !== fingerprint) {
      return { ok: false, error: 'License key sudah diaktivasi di perangkat lain' };
    }
  }
  if (new Date(license.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'License key sudah expired' };
  }

  // 2. Update license with studio data + fingerprint
  const { error: updateErr } = await supabase.from('licenses').update({
    studio_name: activation.studioName || license.studio_name,
    studio_address: activation.studioAddress || license.studio_address,
    owner_email: activation.ownerEmail || license.owner_email,
    owner_phone: activation.ownerPhone || license.owner_phone || null,
    device_fingerprint: fingerprint,
    activated_at: new Date().toISOString(),
    last_validated_at: new Date().toISOString(),
  }).eq('id', license.id);

  if (updateErr) return { ok: false, error: 'Gagal aktivasi: ' + updateErr.message };

  // 3. Fetch users for this license
  const { data: users } = await supabase
    .from('license_users')
    .select('email, password_hash, full_name, role')
    .eq('license_id', license.id);

  // 4. Clear demo data & provision users
  await db.transaction('rw', [db.users, db.members, db.coaches, db.products, db.packages, db.memberPackages, db.bookings, db.productSales, db.memberPayments, db.coachCommissions], async () => {
    // Preserve existing owner accounts before clearing
    const ownerUsers = await db.users.where('role').equals('owner').toArray();

    // Clear all demo data
    await Promise.all([
      db.users.clear(), db.members.clear(), db.coaches.clear(),
      db.products.clear(), db.packages.clear(), db.memberPackages.clear(),
      db.bookings.clear(), db.productSales.clear(), db.memberPayments.clear(),
      db.coachCommissions.clear(),
    ]);

    // Restore owner accounts (already registered, must not be re-provisioned)
    if (ownerUsers.length) {
      await db.users.bulkAdd(ownerUsers);
    }

    // Provision only admin/staff users from Supabase (owner already exists locally)
    const adminUsers = (users ?? []).filter((u: LicenseUser) => u.role !== 'owner');
    if (adminUsers.length) {
      await db.users.bulkAdd(adminUsers.map((u: LicenseUser) => ({
        id: crypto.randomUUID(),
        email: u.email,
        password_hash: u.password_hash,
        full_name: u.full_name,
        role: u.role as 'owner' | 'staff',
        created_at: new Date().toISOString(),
      })));
    }
  });

  // 5. Store license locally
  storeLicense({ ...license, studio_name: activation.studioName, studio_address: activation.studioAddress, owner_email: activation.ownerEmail, activated_at: new Date().toISOString() } as LicenseInfo);

  return { ok: true };
}
