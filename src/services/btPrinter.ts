// src/services/btPrinter.ts
// Transport ESC/POS via Web Bluetooth. Banyak printer thermal mengekspos
// service serial dengan UUID di bawah; kita daftarkan sebagai optionalServices
// dan biarkan user memilih perangkat (acceptAllDevices) agar kompatibel luas.
import { usePrinterStore } from '@/stores/printer';

const PRINTER_SERVICES = [
  0x18f0,                                   // umum (banyak printer 58/80mm)
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // ISSC / sejumlah modul BT
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];
const CHUNK = 256; // byte per tulis; cukup kecil untuk buffer printer murah

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// UUIDs of the known thermal-printer services, normalised to full 128-bit lowercase form.
const PREFERRED_SERVICE_UUIDS = new Set(
  PRINTER_SERVICES.map((s) =>
    (typeof s === 'number' ? `0000${s.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb` : s).toLowerCase(),
  ),
);

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  // Try the known printer services FIRST: a generic service may also expose a writable
  // characteristic, and writing the receipt there "succeeds" silently but prints nothing.
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

// Named handler so repeated reconnects don't stack duplicate listeners, and so a
// passive drop (printer powered off while idle) immediately reflects in the UI.
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

/** Tampilkan device chooser (butuh user gesture). Mengembalikan perangkat terpilih. */
export async function connect(): Promise<BluetoothDevice> {
  if (!isSupported()) throw new Error('Web Bluetooth tidak didukung di perangkat ini');
  const dev = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });
  await attach(dev);
  return dev;
}

/** Sambung ulang tanpa prompt ke device tersimpan (best-effort). */
export async function reconnect(deviceId?: string): Promise<boolean> {
  if (!isSupported() || !deviceId || !navigator.bluetooth.getDevices) return false;
  try {
    const known = await navigator.bluetooth.getDevices();
    const dev = known.find((d) => d.id === deviceId);
    if (!dev) return false;
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
  device?.gatt?.disconnect();
  characteristic = null;
  device = null;
}

/** Kirim byte ESC/POS dengan chunking agar buffer printer tidak overflow. */
export async function print(bytes: Uint8Array): Promise<void> {
  if (!characteristic) throw new Error('Printer belum terhubung');
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(slice);
    } else {
      await characteristic.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 20)); // jeda antar-chunk
  }
}
