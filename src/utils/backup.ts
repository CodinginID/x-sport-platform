import { db } from '@/database/db';
import { useBackupStore } from '@/stores/backup';
import { supabase, BACKUP_BUCKET } from '@/lib/supabase';

// Serialize all Dexie tables to JSON
async function serializeDB(): Promise<string> {
  const [users, members, coaches, products, packages, memberPackages, bookings, productSales, memberPayments, coachCommissions] = await Promise.all([
    db.users.toArray(),
    db.members.toArray(),
    db.coaches.toArray(),
    db.products.toArray(),
    db.packages.toArray(),
    db.memberPackages.toArray(),
    db.bookings.toArray(),
    db.productSales.toArray(),
    db.memberPayments.toArray(),
    db.coachCommissions.toArray(),
  ]);
  return JSON.stringify({ users, members, coaches, products, packages, memberPackages, bookings, productSales, memberPayments, coachCommissions, exportedAt: new Date().toISOString() });
}

// Encrypt with PIN (AES-GCM)
async function encrypt(data: string, pin: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin.padEnd(16, '0').slice(0, 16)), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

// Decrypt with PIN (AES-GCM)
async function decrypt(data: ArrayBuffer, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const arr = new Uint8Array(data);
  const iv = arr.slice(0, 12);
  const encrypted = arr.slice(12);
  const key = await crypto.subtle.importKey('raw', enc.encode(pin.padEnd(16, '0').slice(0, 16)), 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// Upload encrypted backup to Supabase Storage
export async function performBackup(): Promise<boolean> {
  const { studioId, pin, setLastBackup, setIsBackingUp } = useBackupStore.getState();
  if (!studioId || !pin || !navigator.onLine) return false;

  setIsBackingUp(true);
  try {
    const json = await serializeDB();
    const encrypted = await encrypt(json, pin);
    const path = `${studioId}/backup.enc`;

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(path, encrypted, { contentType: 'application/octet-stream', upsert: true });

    if (error) throw error;
    const now = new Date().toISOString();
    setLastBackup(now);
    return true;
  } catch (e) {
    console.error('Backup failed:', e);
    return false;
  } finally {
    setIsBackingUp(false);
  }
}

// Download and restore from Supabase Storage
export async function performRestore(studioId: string, pin: string): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const path = `${studioId}/backup.enc`;
    const { data, error } = await supabase.storage.from(BACKUP_BUCKET).download(path);
    if (error || !data) throw error || new Error('No data');

    const buffer = await data.arrayBuffer();
    const json = await decrypt(buffer, pin);
    const parsed = JSON.parse(json);

    await db.transaction('rw', [db.users, db.members, db.coaches, db.products, db.packages, db.memberPackages, db.bookings, db.productSales, db.memberPayments, db.coachCommissions], async () => {
      await Promise.all([db.users.clear(), db.members.clear(), db.coaches.clear(), db.products.clear(), db.packages.clear(), db.memberPackages.clear(), db.bookings.clear(), db.productSales.clear(), db.memberPayments.clear(), db.coachCommissions.clear()]);
      if (parsed.users?.length) await db.users.bulkAdd(parsed.users);
      if (parsed.members?.length) await db.members.bulkAdd(parsed.members);
      if (parsed.coaches?.length) await db.coaches.bulkAdd(parsed.coaches);
      if (parsed.products?.length) await db.products.bulkAdd(parsed.products);
      if (parsed.packages?.length) await db.packages.bulkAdd(parsed.packages);
      if (parsed.memberPackages?.length) await db.memberPackages.bulkAdd(parsed.memberPackages);
      if (parsed.bookings?.length) await db.bookings.bulkAdd(parsed.bookings);
      if (parsed.productSales?.length) await db.productSales.bulkAdd(parsed.productSales);
      if (parsed.memberPayments?.length) await db.memberPayments.bulkAdd(parsed.memberPayments);
      if (parsed.coachCommissions?.length) await db.coachCommissions.bulkAdd(parsed.coachCommissions);
    });

    useBackupStore.getState().setCredentials(studioId, pin);
    return true;
  } catch (e) {
    console.error('Restore failed:', e);
    return false;
  }
}

// Export as local JSON file
export async function exportToFile(): Promise<void> {
  const json = await serializeDB();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xsport-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import from local JSON file
export async function importFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await db.transaction('rw', [db.users, db.members, db.coaches, db.products, db.packages, db.memberPackages, db.bookings, db.productSales, db.memberPayments, db.coachCommissions], async () => {
      await Promise.all([db.users.clear(), db.members.clear(), db.coaches.clear(), db.products.clear(), db.packages.clear(), db.memberPackages.clear(), db.bookings.clear(), db.productSales.clear(), db.memberPayments.clear(), db.coachCommissions.clear()]);
      if (data.users?.length) await db.users.bulkAdd(data.users);
      if (data.members?.length) await db.members.bulkAdd(data.members);
      if (data.coaches?.length) await db.coaches.bulkAdd(data.coaches);
      if (data.products?.length) await db.products.bulkAdd(data.products);
      if (data.packages?.length) await db.packages.bulkAdd(data.packages);
      if (data.memberPackages?.length) await db.memberPackages.bulkAdd(data.memberPackages);
      if (data.bookings?.length) await db.bookings.bulkAdd(data.bookings);
      if (data.productSales?.length) await db.productSales.bulkAdd(data.productSales);
      if (data.memberPayments?.length) await db.memberPayments.bulkAdd(data.memberPayments);
      if (data.coachCommissions?.length) await db.coachCommissions.bulkAdd(data.coachCommissions);
    });
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

// Auto-backup: triggered when app comes back online
let pendingBackup = false;

export function scheduleBackup() {
  const { autoBackupEnabled, studioId } = useBackupStore.getState();
  if (!autoBackupEnabled || !studioId) return;
  if (navigator.onLine) {
    performBackup();
  } else {
    pendingBackup = true;
  }
}

// Listen for online event — auto-backup when reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const { autoBackupEnabled, studioId } = useBackupStore.getState();
    if (pendingBackup || autoBackupEnabled) {
      if (studioId) {
        pendingBackup = false;
        performBackup();
      }
    }
  });
}
