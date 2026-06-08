import { supabase } from '@/lib/supabase';
import { getDeviceFingerprint } from '@/utils/fingerprint';

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

export function getStoredLicense(): (LicenseInfo & { validatedAt: string }) | null {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeLicense(license: LicenseInfo) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({ ...license, validatedAt: new Date().toISOString() }));
}

export function storePendingLicense(license: LicenseInfo) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({ ...license, validatedAt: new Date().toISOString() }));
}

export function clearStoredLicense() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

export function isActivated(): boolean {
  return getStoredLicense()?.activated_at != null;
}

export function isWithinGracePeriod(): boolean {
  const license = getStoredLicense();
  if (!license) return false;
  const graceDays = license.grace_period_days || 30;
  const lastValidated = new Date(license.validatedAt).getTime();
  return (Date.now() - lastValidated) < graceDays * 24 * 60 * 60 * 1000;
}

export function isLicenseExpired(): boolean {
  const license = getStoredLicense();
  if (!license) return true;
  return new Date(license.expires_at).getTime() < Date.now();
}

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

  await supabase.from('licenses').update({ last_validated_at: new Date().toISOString() }).eq('id', data.id);

  storeLicense(data as LicenseInfo);
  return { ok: true, data: data as LicenseInfo };
}

export async function activateLicense(activation: ActivationData): Promise<LicenseResult> {
  const fingerprint = await getDeviceFingerprint();

  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', activation.licenseKey)
    .single();

  if (error || !license) return { ok: false, error: 'License key tidak ditemukan' };
  if (!license.is_active) return { ok: false, error: 'License key belum disetujui admin. Hubungi developer.' };
  if (license.activated_at && license.device_fingerprint !== fingerprint) {
    return { ok: false, error: 'License key sudah diaktivasi di perangkat lain' };
  }
  if (new Date(license.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'License key sudah expired' };
  }

  const activatedAt = new Date().toISOString();
  const { error: updateErr } = await supabase.from('licenses').update({
    studio_name: activation.studioName || license.studio_name,
    studio_address: activation.studioAddress || license.studio_address,
    owner_email: activation.ownerEmail || license.owner_email,
    owner_phone: activation.ownerPhone || license.owner_phone || null,
    device_fingerprint: fingerprint,
    activated_at: activatedAt,
    last_validated_at: activatedAt,
  }).eq('id', license.id);

  if (updateErr) return { ok: false, error: 'Gagal aktivasi: ' + updateErr.message };

  // Provision all license_users into the studio's users table
  const { data: licenseUsers } = await supabase
    .from('license_users')
    .select('email, password_hash, full_name, role')
    .eq('license_id', license.id);

  if (licenseUsers?.length) {
    const rows = (licenseUsers as LicenseUser[]).map(u => ({
      user_id: crypto.randomUUID(),
      studio_id: license.id,
      email: u.email,
      password_hash: u.password_hash,
      full_name: u.full_name,
      role: u.role,
      created_at: activatedAt,
      updated_at: activatedAt,
    }));
    // upsert: if user with same studio_id+email exists, update password/name
    await supabase.from('users').upsert(rows, { onConflict: 'studio_id,email' });
  }

  storeLicense({
    ...license,
    studio_name: activation.studioName || license.studio_name,
    studio_address: activation.studioAddress || license.studio_address,
    owner_email: activation.ownerEmail || license.owner_email,
    activated_at: activatedAt,
    last_validated_at: activatedAt,
  } as LicenseInfo);

  return { ok: true };
}
