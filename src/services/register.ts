import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/utils';
import { db } from '@/database/db';

export interface RegisterData {
  studioName: string;
  studioAddress: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerName: string;
  password: string;
}

export type RegisterResult = { ok: true; licenseKey: string } | { ok: false; error: string };

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `XSP-${part()}-${part()}`;
}

export async function registerStudio(data: RegisterData): Promise<RegisterResult> {
  if (!navigator.onLine) return { ok: false, error: 'Koneksi internet diperlukan untuk registrasi' };

  const licenseKey = generateKey();
  const passwordHash = await hashPassword(data.password);

  // Insert license with status pending (is_active = false)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data: license, error: licErr } = await supabase.from('licenses').insert({
    license_key: licenseKey,
    studio_name: data.studioName,
    studio_address: data.studioAddress,
    owner_email: data.ownerEmail,
    owner_phone: data.ownerPhone || null,
    plan: 'basic',
    storage_quota_mb: 50,
    expires_at: expiresAt.toISOString(),
    is_active: false, // pending approval
  }).select('id').single();

  if (licErr) return { ok: false, error: 'Gagal registrasi: ' + licErr.message };

  // Insert owner user to Supabase license_users
  const { error: userErr } = await supabase.from('license_users').insert({
    license_id: license.id,
    email: data.ownerEmail,
    password_hash: passwordHash,
    full_name: data.ownerName,
    role: 'owner',
  });

  if (userErr) return { ok: false, error: 'Gagal simpan user: ' + userErr.message };

  // Also provision owner to local IndexedDB so they can login immediately
  const existingOwner = await db.users.where('email').equals(data.ownerEmail).first();
  if (!existingOwner) {
    await db.users.add({
      id: crypto.randomUUID(),
      email: data.ownerEmail,
      password_hash: passwordHash,
      full_name: data.ownerName,
      role: 'owner',
      created_at: new Date().toISOString(),
    });
  }

  return { ok: true, licenseKey };
}
