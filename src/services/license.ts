import { supabase } from '@/lib/supabase';
import { getDeviceFingerprint } from '@/utils/fingerprint';
import type { LicenseInfo } from '@/types';

export type { LicenseInfo };

export interface ActivationData {
  licenseKey: string;
  studioName: string;
  studioAddress: string;
  ownerEmail: string;
  ownerPhone?: string;
}

export type LicenseResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

interface LicenseUser {
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
}

export async function validateLicense(licenseKey: string): Promise<LicenseResult<LicenseInfo>> {
  const fingerprint = await getDeviceFingerprint();

  const { data, error } = await supabase
    .from('licenses').select('*')
    .eq('license_key', licenseKey)
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

  return { ok: true, data: data as LicenseInfo };
}

export async function activateLicense(activation: ActivationData): Promise<LicenseResult<LicenseInfo>> {
  const fingerprint = await getDeviceFingerprint();

  const { data: license, error } = await supabase
    .from('licenses').select('*')
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
    .from('license_users').select('email, password_hash, full_name, role')
    .eq('license_id', license.id);

  if (licenseUsers?.length) {
    const rows = (licenseUsers as LicenseUser[]).map(u => ({
      id: crypto.randomUUID(),
      studio_id: license.id,
      email: u.email,
      password_hash: u.password_hash,
      full_name: u.full_name,
      role: u.role,
      created_at: activatedAt,
    }));
    await supabase.from('users').upsert(rows, { onConflict: 'studio_id,email' });
  }

  // Return fresh license data
  const { data: fresh } = await supabase.from('licenses').select('*').eq('id', license.id).single();
  return { ok: true, data: fresh as LicenseInfo };
}

// Helpers used by LicenseGuard / LicenseSection via auth store
export function isLicenseExpired(license: LicenseInfo | null): boolean {
  if (!license) return true;
  return new Date(license.expires_at).getTime() < Date.now();
}

export function isWithinGracePeriod(license: LicenseInfo | null, lastUsedAt: string | null): boolean {
  if (!license || !lastUsedAt) return false;
  const graceDays = license.grace_period_days || 30;
  return (Date.now() - new Date(lastUsedAt).getTime()) < graceDays * 86_400_000;
}
