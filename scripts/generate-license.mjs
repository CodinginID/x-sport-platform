#!/usr/bin/env node

/**
 * Generate License Key + User untuk X-Sport Platform
 *
 * Usage:
 *   node scripts/generate-license.mjs
 *   node scripts/generate-license.mjs --key XSP-CUSTOM-KEY01
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 * (service key, bukan anon key — supaya bypass RLS)
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cjiopascmwicdibaqeve.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_KEY env var (service_role key dari Supabase Dashboard)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Helpers ---

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `XSP-${part()}-${part()}`;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// --- Main ---

async function main() {
  console.log('\n🔑 X-Sport License Generator\n');

  // License key
  const customKey = process.argv.find(a => a.startsWith('--key='))?.split('=')[1];
  const licenseKey = customKey || generateKey();

  // Expiry
  const months = parseInt(await prompt('Masa berlaku (bulan) [12]: ') || '12');
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Plan
  const plan = await prompt('Plan (basic/pro/enterprise) [basic]: ') || 'basic';
  const quotaMap = { basic: 50, pro: 200, enterprise: 1000 };
  const quota = quotaMap[plan] || 50;

  // User
  const ownerEmail = await prompt('Email login owner: ');
  if (!ownerEmail) { console.error('❌ Email wajib diisi'); process.exit(1); }
  const ownerName = await prompt('Nama owner: ') || 'Owner';
  const ownerPassword = generatePassword();
  const passwordHash = await hashPassword(ownerPassword);

  // Insert license
  const { data: license, error: licErr } = await supabase.from('licenses').insert({
    license_key: licenseKey,
    plan,
    storage_quota_mb: quota,
    expires_at: expiresAt.toISOString(),
    grace_period_days: 30,
    is_active: true,
  }).select().single();

  if (licErr) { console.error('❌ Gagal insert license:', licErr.message); process.exit(1); }

  // Insert user
  const { error: userErr } = await supabase.from('license_users').insert({
    license_id: license.id,
    email: ownerEmail,
    password_hash: passwordHash,
    full_name: ownerName,
    role: 'owner',
  });

  if (userErr) { console.error('❌ Gagal insert user:', userErr.message); process.exit(1); }

  // Output
  console.log('\n✅ License berhasil dibuat!\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log(`│ License Key : ${licenseKey}`);
  console.log(`│ Plan        : ${plan} (${quota} MB storage)`);
  console.log(`│ Expires     : ${expiresAt.toLocaleDateString('id-ID')}`);
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│ Email Login : ${ownerEmail}`);
  console.log(`│ Password    : ${ownerPassword}`);
  console.log('└─────────────────────────────────────────────┘');
  console.log('\n📋 Kirim info di atas ke client.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
