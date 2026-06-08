import { useBackupStore } from '@/stores/backup';
import { supabase, BACKUP_BUCKET } from '@/lib/supabase';
import { getStoredLicense } from '@/services/license';

export type BackupResult = { ok: true } | { ok: false; error: string };

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

// Data is stored in Supabase — export a lightweight metadata snapshot for record-keeping
async function buildSnapshot(): Promise<string> {
  const license = getStoredLicense();
  return JSON.stringify({
    license_key: license?.license_key ?? null,
    studio_name: license?.studio_name ?? null,
    exportedAt: new Date().toISOString(),
    note: 'Data operasional tersimpan di Supabase cloud.',
  });
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

// Upload snapshot to Supabase Storage (metadata only — actual data already in Supabase)
export async function performBackup(): Promise<BackupResult> {
  const { studioId, pin, setLastBackup, setIsBackingUp } = useBackupStore.getState();
  if (!studioId || !pin) return { ok: false, error: 'Studio ID atau PIN belum ada' };
  if (!navigator.onLine) return { ok: false, error: 'Offline — backup akan otomatis jalan saat online' };

  const license = getStoredLicense();
  if (license && license.storage_used_mb >= license.storage_quota_mb) {
    return { ok: false, error: `Storage penuh (${license.storage_used_mb}/${license.storage_quota_mb} MB).` };
  }

  setIsBackingUp(true);
  try {
    const json = await buildSnapshot();
    const encrypted = await encrypt(json, pin);
    const path = `${studioId}/backup.enc`;

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(path, encrypted, { contentType: 'application/octet-stream', upsert: true });

    if (error) throw error;

    setLastBackup(new Date().toISOString());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  } finally {
    setIsBackingUp(false);
  }
}

// Restore is a no-op since data lives in Supabase — just verify credentials
export async function performRestore(studioId: string, pin: string): Promise<BackupResult> {
  if (!navigator.onLine) return { ok: false, error: 'Offline — koneksi internet diperlukan untuk restore' };
  try {
    const path = `${studioId}/backup.enc`;
    const { data, error } = await supabase.storage.from(BACKUP_BUCKET).download(path);
    if (error || !data) throw error || new Error('Backup tidak ditemukan untuk Studio ID ini');

    const buffer = await data.arrayBuffer();
    await decrypt(buffer, pin);

    useBackupStore.getState().setCredentials(studioId, pin);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

// Export license snapshot as local JSON file
export async function exportToFile(): Promise<void> {
  const json = await buildSnapshot();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xsport-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import from file is disabled (data managed in Supabase)
export async function importFromFile(_file: File): Promise<BackupResult> {
  return { ok: false, error: 'Import file tidak didukung di mode cloud. Data dikelola langsung di Supabase.' };
}

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
