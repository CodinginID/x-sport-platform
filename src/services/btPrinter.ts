// src/services/btPrinter.ts
// Transport ESC/POS via Web Bluetooth.
import { usePrinterStore } from '@/stores/printer';

const PRINTER_SERVICES = [
  0x18f0,
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];
const CHUNK = 256;

// State module-level
let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let bgTimer: ReturnType<typeof setInterval> | null = null;
let isReconnecting = false; // cegah concurrent GATT connect

export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

const PREFERRED_SERVICE_UUIDS = new Set(
  PRINTER_SERVICES.map((s) =>
    (typeof s === 'number' ? `0000${s.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb` : s).toLowerCase(),
  ),
);

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  const ordered = [...services].sort((a, b) => {
    const pa = PREFERRED_SERVICE_UUIDS.has(a.uuid.toLowerCase()) ? 0 : 1;
    const pb = PREFERRED_SERVICE_UUIDS.has(b.uuid.toLowerCase()) ? 0 : 1;
    return pa - pb;
  });
  for (const svc of ordered) {
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) return writable;
  }
  throw new Error('Printer tidak memiliki karakteristik yang bisa ditulis');
}

function handleDisconnected(): void {
  characteristic = null;
  device = null;
  usePrinterStore.getState().setStatus('disconnected');
}

// GATT timeout 3 detik — cukup untuk printer yang responsif,
// gagal cepat untuk yang tidak dalam jangkauan
const GATT_TIMEOUT_MS = 3000;

async function attach(dev: BluetoothDevice): Promise<void> {
  // Wrap seluruh proses (connect + service discovery) dalam satu timeout
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('gatt timeout')), GATT_TIMEOUT_MS);
    dev.gatt!.connect()
      .then((server) => findWritableCharacteristic(server))
      .then((char) => {
        clearTimeout(timer);
        characteristic = char;
        device = dev;
        dev.removeEventListener('gattserverdisconnected', handleDisconnected);
        dev.addEventListener('gattserverdisconnected', handleDisconnected);
        resolve();
      })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/** Tampilkan device chooser — butuh user gesture. */
export async function connect(): Promise<BluetoothDevice> {
  if (!isSupported()) throw new Error('Web Bluetooth tidak didukung di perangkat ini');
  const dev = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });
  await attach(dev);
  return dev;
}

/**
 * Hasil reconnect — membedakan dua kondisi gagal yang butuh penanganan berbeda.
 * 'connected'       → berhasil
 * 'out_of_range'    → device dikenal browser, tapi GATT gagal (printer mati/jauh) → retry
 * 'permission_lost' → browser tidak kenal device ini sama sekali → perlu pair ulang
 */
export type ReconnectResult = 'connected' | 'out_of_range' | 'permission_lost';

export async function reconnect(deviceId?: string): Promise<ReconnectResult> {
  if (!isSupported() || !deviceId || !navigator.bluetooth.getDevices) return 'permission_lost';
  let known: BluetoothDevice[];
  try { known = await navigator.bluetooth.getDevices(); } catch { return 'permission_lost'; }
  const dev = known.find((d) => d.id === deviceId);
  if (!dev) return 'permission_lost';
  try { await attach(dev); return 'connected'; } catch { return 'out_of_range'; }
}

export function isConnected(): boolean {
  return !!characteristic && !!device?.gatt?.connected;
}

export function disconnect(): void {
  stopBackgroundReconnect();
  device?.gatt?.disconnect();
  characteristic = null;
  device = null;
}

/**
 * Background reconnect loop.
 *
 * Interval 2s, tapi tidak akan overlap: kalau attempt sebelumnya belum
 * selesai (GATT timeout 3s), tick berikutnya di-skip via isReconnecting flag.
 * Efeknya: printer selalu di-coba ulang segera setelah setiap attempt selesai.
 *
 * Berhenti otomatis saat:
 * - berhasil connect
 * - permission_lost (browser tidak kenal device)
 * - cleanup dipanggil (unmount)
 */
const BG_INTERVAL_MS = 2000;

// Berapa kali getDevices() boleh return kosong sebelum dianggap permission benar-benar hilang.
// getDevices() bisa return [] sementara setelah refresh/restart — bukan berarti izin hilang.
const PERMISSION_LOST_THRESHOLD = 10;

export function startBackgroundReconnect(
  deviceId: string,
  onConnected: () => void,
  onPermissionLost: () => void,
): () => void {
  stopBackgroundReconnect();
  let consecutivePermissionLost = 0;

  bgTimer = setInterval(async () => {
    if (isConnected() || isReconnecting) return;
    isReconnecting = true;
    try {
      const result = await reconnect(deviceId);
      if (result === 'connected') {
        consecutivePermissionLost = 0;
        onConnected();
        stopBackgroundReconnect();
      } else if (result === 'permission_lost') {
        consecutivePermissionLost++;
        // Hanya stop jika konsisten kosong — bukan sekali saja
        if (consecutivePermissionLost >= PERMISSION_LOST_THRESHOLD) {
          stopBackgroundReconnect();
          onPermissionLost();
        }
      } else {
        // 'out_of_range': device ada di getDevices(), GATT gagal — reset counter
        consecutivePermissionLost = 0;
      }
    } finally {
      isReconnecting = false;
    }
  }, BG_INTERVAL_MS);

  return stopBackgroundReconnect;
}

function stopBackgroundReconnect(): void {
  if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
}

/**
 * Daftarkan watchAdvertisements untuk deviceId tersimpan.
 * Ketika printer broadcast (nyala & dalam jangkauan), langsung connect
 * tanpa menunggu background loop — ini yang bikin "instant reconnect"
 * saat printer dinyalakan ulang.
 */
export async function watchForDevice(deviceId: string, onConnected: () => void): Promise<void> {
  if (!isSupported() || !navigator.bluetooth.getDevices) return;
  try {
    const known = await navigator.bluetooth.getDevices();
    const dev = known.find((d) => d.id === deviceId);
    if (!dev) return;

    type BtDevExt = BluetoothDevice & {
      _xsportHandler?: EventListener;
      watchAdvertisements?: (opts?: { signal?: AbortSignal }) => Promise<void>;
    };
    const d = dev as BtDevExt;
    if (!d.watchAdvertisements) return;

    if (d._xsportHandler) dev.removeEventListener('advertisementreceived', d._xsportHandler);

    const handler: EventListener = async () => {
      if (!isConnected() && !isReconnecting) {
        isReconnecting = true;
        try { await attach(dev); onConnected(); }
        catch { /* printer terdeteksi tapi GATT belum siap */ }
        finally { isReconnecting = false; }
      }
    };
    d._xsportHandler = handler;
    dev.addEventListener('advertisementreceived', handler);
    await d.watchAdvertisements();
  } catch { /* tidak tersedia di browser ini */ }
}

/** Kirim byte ESC/POS dengan chunking. */
export async function print(bytes: Uint8Array): Promise<void> {
  if (!characteristic) throw new Error('Printer belum terhubung');
  const c = characteristic;
  const ack = c.properties.write;
  const writeAck = (data: BufferSource) =>
    typeof c.writeValueWithResponse === 'function' ? c.writeValueWithResponse(data) : c.writeValue(data);

  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (ack) {
      await writeAck(slice);
    } else {
      await c.writeValueWithoutResponse(slice);
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  await new Promise((r) => setTimeout(r, 150));
}
