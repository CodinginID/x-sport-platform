import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/utils';
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

export interface StaffCredentials {
  email: string;
  password: string;
  full_name: string;
}

// Specific return type for activateLicense (extends with generated staff creds)
export type ActivateLicenseResult =
  | { ok: true; data?: LicenseInfo; generatedStaff?: StaffCredentials }
  | { ok: false; error: string };

interface LicenseUser {
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateStaffEmail(studioName: string): string {
  const slug = studioName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'studio';
  return `staff.${slug}@xsport.flowbiz.id`;
}

function generateStaffPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// ─── validateLicense ──────────────────────────────────────────────────────────

export async function validateLicense(licenseKey: string): Promise<LicenseResult<LicenseInfo>> {
  // Device switching is allowed: enforcement is per-session (1 active login per user),
  // not per-device. We only validate that the license is active & not expired.
  const { data, error } = await supabase
    .from('licenses').select('*')
    .eq('license_key', licenseKey)
    .eq('is_active', true)
    .single();

  if (error || !data) return { ok: false, error: 'Lisensi tidak valid atau sudah dinonaktifkan' };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Lisensi sudah expired' };
  }

  await supabase.from('licenses').update({ last_validated_at: new Date().toISOString() }).eq('id', data.id);

  return { ok: true, data: data as LicenseInfo };
}

// ─── activateLicense ──────────────────────────────────────────────────────────

export async function activateLicense(activation: ActivationData): Promise<ActivateLicenseResult> {
  const { data: license, error } = await supabase
    .from('licenses').select('*')
    .eq('license_key', activation.licenseKey)
    .single();

  if (error || !license) return { ok: false, error: 'License key tidak ditemukan' };
  if (!license.is_active) return { ok: false, error: 'License key belum disetujui admin. Hubungi developer.' };
  // No device binding: a license can be (re)activated from any device. Concurrent use is
  // prevented by the per-user session limit (login revokes the user's other sessions).
  if (new Date(license.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'License key sudah expired' };
  }

  const activatedAt = new Date().toISOString();
  const { error: updateErr } = await supabase.from('licenses').update({
    studio_name: activation.studioName || license.studio_name,
    studio_address: activation.studioAddress || license.studio_address,
    owner_email: activation.ownerEmail || license.owner_email,
    owner_phone: activation.ownerPhone || license.owner_phone || null,
    activated_at: activatedAt,
    last_validated_at: activatedAt,
  }).eq('id', license.id);

  if (updateErr) return { ok: false, error: 'Gagal aktivasi: ' + updateErr.message };

  // ── Auto-generate staff account if none exists in license_users ──────────────
  let generatedStaff: StaffCredentials | undefined;

  const { data: existingLicenseUsers } = await supabase
    .from('license_users').select('role')
    .eq('license_id', license.id);

  const hasStaff = (existingLicenseUsers ?? []).some(u => u.role === 'staff');

  if (!hasStaff) {
    const staffEmail    = generateStaffEmail(activation.studioName || license.studio_name || license.license_key.split('-')[1]);
    const staffPassword = generateStaffPassword();
    const staffHash     = await hashPassword(staffPassword);

    await supabase.from('license_users').insert({
      license_id:    license.id,
      email:         staffEmail,
      password_hash: staffHash,
      full_name:     'Staff',
      role:          'staff',
    });

    generatedStaff = { email: staffEmail, password: staffPassword, full_name: 'Staff' };
  }

  // ── Provision all license_users → users table ─────────────────────────────
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

  const { data: fresh } = await supabase.from('licenses').select('*').eq('id', license.id).single();
  return { ok: true, data: fresh as LicenseInfo, generatedStaff };
}

// ─── Helpers used by LicenseGuard / LicenseSection ───────────────────────────

export function isLicenseExpired(license: LicenseInfo | null): boolean {
  if (!license) return true;
  return new Date(license.expires_at).getTime() < Date.now();
}

export function isWithinGracePeriod(license: LicenseInfo | null, lastUsedAt: string | null): boolean {
  if (!license || !lastUsedAt) return false;
  const graceDays = license.grace_period_days || 30;
  return (Date.now() - new Date(lastUsedAt).getTime()) < graceDays * 86_400_000;
}
