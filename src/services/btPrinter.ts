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

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let bgTimer: ReturnType<typeof setInterval> | null = null;

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

async function attach(dev: BluetoothDevice): Promise<void> {
  const server = await dev.gatt!.connect();
  characteristic = await findWritableCharacteristic(server);
  device = dev;
  dev.removeEventListener('gattserverdisconnected', handleDisconnected);
  dev.addEventListener('gattserverdisconnected', handleDisconnected);
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
 * Coba sambung ulang ke deviceId tersimpan — tanpa user gesture.
 * Bekerja karena izin Bluetooth persisten di browser (bertahan setelah refresh/update app).
 * Return true jika berhasil.
 */
export async function reconnect(deviceId?: string): Promise<boolean> {
  if (!isSupported() || !deviceId || !navigator.bluetooth.getDevices) return false;
  try {
    const known = await navigator.bluetooth.getDevices();
    const dev = known.find((d) => d.id === deviceId);
    if (!dev) return false; // izin hilang (browser di-reset / storage dihapus)
    await attach(dev);
    return true;
  } catch {
    return false;
  }
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
 * Mulai background reconnect loop.
 * Coba reconnect setiap INTERVAL_MS selama belum connected.
 * Berhenti otomatis saat berhasil, atau saat cleanup dipanggil.
 * Ini adalah mekanisme utama "kunci pairing" — setelah pernah pair,
 * printer selalu tersambung kembali tanpa user gesture.
 */
const BG_INTERVAL_MS = 7000;

export function startBackgroundReconnect(deviceId: string, onConnected: () => void): () => void {
  stopBackgroundReconnect();

  let attempt = 0;
  bgTimer = setInterval(async () => {
    if (isConnected()) { stopBackgroundReconnect(); return; }
    attempt++;
    const ok = await reconnect(deviceId);
    if (ok) {
      onConnected();
      stopBackgroundReconnect();
    }
    // Setelah 10 menit tanpa berhasil (≈85 percobaan), kurangi frekuensi
    // dengan membiarkan interval tetap jalan tapi skip selang-seling
    if (attempt > 85 && attempt % 2 !== 0) return;
  }, BG_INTERVAL_MS);

  return stopBackgroundReconnect;
}

function stopBackgroundReconnect(): void {
  if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
}

/**
 * Daftarkan watchAdvertisements — jika printer masuk jangkauan,
 * langsung reconnect tanpa menunggu interval.
 * Fallback graceful: kalau browser tidak support, tidak error.
 */
export async function watchForDevice(deviceId: string, onConnected: () => void): Promise<void> {
  if (!isSupported() || !navigator.bluetooth.getDevices) return;
  try {
    const known = await navigator.bluetooth.getDevices();
    const dev = known.find((d) => d.id === deviceId);
    if (!dev) return;

    type BtDevExt = BluetoothDevice & {
      _xsportHandler?: EventListener;
      watchAdvertisements?: () => Promise<void>;
    };
    const d = dev as BtDevExt;

    if (!d.watchAdvertisements) return;

    if (d._xsportHandler) dev.removeEventListener('advertisementreceived', d._xsportHandler);

    const handler: EventListener = async () => {
      if (!isConnected()) {
        try { await attach(dev); onConnected(); } catch { /* GATT gagal sementara */ }
      }
    };
    d._xsportHandler = handler;
    dev.addEventListener('advertisementreceived', handler);
    await d.watchAdvertisements();
  } catch { /* tidak tersedia */ }
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
