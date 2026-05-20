#!/usr/bin/env node

/**
 * Approve / Reject License untuk X-Sport Platform
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/approve-license.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/approve-license.mjs --key XSP-XXXXX-XXXXX
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'readline';

const SUPABASE_URL = 'https://cjiopascmwicdibaqeve.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_KEY env var (service_role key dari Supabase Dashboard > Settings > API)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function listPending() {
  const { data, error } = await supabase
    .from('licenses')
    .select('id, license_key, studio_name, owner_email, owner_phone, plan, created_at, is_active')
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  if (error) { console.error('❌ Gagal fetch licenses:', error.message); process.exit(1); }
  return data;
}

async function approveLicense(id, licenseKey) {
  const { error } = await supabase
    .from('licenses')
    .update({ is_active: true })
    .eq('id', id);

  if (error) { console.error('❌ Gagal approve:', error.message); process.exit(1); }
  console.log(`\n✅ License ${licenseKey} berhasil di-approve! Studio owner sekarang bisa aktivasi.\n`);
}

async function rejectLicense(id, licenseKey) {
  const { error } = await supabase
    .from('licenses')
    .delete()
    .eq('id', id);

  if (error) { console.error('❌ Gagal reject:', error.message); process.exit(1); }
  console.log(`\n🗑️  License ${licenseKey} dihapus.\n`);
}

async function main() {
  console.log('\n🔐 X-Sport License Approval\n');

  // Mode: approve spesifik key via --key flag
  const specificKey = process.argv.find(a => a.startsWith('--key='))?.split('=')[1]
    || process.argv[process.argv.indexOf('--key') + 1];

  if (specificKey) {
    const { data, error } = await supabase
      .from('licenses')
      .select('id, license_key, studio_name, owner_email, plan, is_active')
      .eq('license_key', specificKey)
      .single();

    if (error || !data) { console.error('❌ License key tidak ditemukan'); process.exit(1); }
    if (data.is_active) { console.log('ℹ️  License ini sudah aktif.'); process.exit(0); }

    console.log(`Studio  : ${data.studio_name || '-'}`);
    console.log(`Email   : ${data.owner_email || '-'}`);
    console.log(`Plan    : ${data.plan}`);
    const action = await prompt('\nApprove? (y/n): ');
    if (action.toLowerCase() === 'y') await approveLicense(data.id, data.license_key);
    else console.log('Dibatalkan.');
    return;
  }

  // Mode: list semua pending
  const pending = await listPending();

  if (pending.length === 0) {
    console.log('✅ Tidak ada registrasi yang menunggu persetujuan.\n');
    return;
  }

  console.log(`📋 ${pending.length} registrasi menunggu persetujuan:\n`);
  pending.forEach((l, i) => {
    const date = new Date(l.created_at).toLocaleString('id-ID');
    console.log(`[${i + 1}] ${l.license_key}`);
    console.log(`    Studio : ${l.studio_name || '-'}`);
    console.log(`    Email  : ${l.owner_email || '-'}`);
    console.log(`    Phone  : ${l.owner_phone || '-'}`);
    console.log(`    Plan   : ${l.plan}  |  Daftar: ${date}`);
    console.log('');
  });

  const choice = await prompt('Pilih nomor untuk di-approve/reject (atau Enter untuk keluar): ');
  if (!choice) { console.log('Keluar.'); return; }

  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= pending.length) {
    console.error('❌ Pilihan tidak valid'); process.exit(1);
  }

  const selected = pending[idx];
  console.log(`\nLicense : ${selected.license_key}`);
  console.log(`Studio  : ${selected.studio_name || '-'}`);
  console.log(`Email   : ${selected.owner_email || '-'}`);

  const action = await prompt('\n[a] Approve  [r] Reject  [Enter] Batal: ');
  if (action.toLowerCase() === 'a') await approveLicense(selected.id, selected.license_key);
  else if (action.toLowerCase() === 'r') await rejectLicense(selected.id, selected.license_key);
  else console.log('Dibatalkan.');
}

main().catch(e => { console.error(e); process.exit(1); });
