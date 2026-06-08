// src/services/btPrinter.ts
// Transport ESC/POS via Web Bluetooth. Banyak printer thermal mengekspos
// service serial dengan UUID di bawah; kita daftarkan sebagai optionalServices
// dan biarkan user memilih perangkat (acceptAllDevices) agar kompatibel luas.

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

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) return writable;
  }
  throw new Error('Printer tidak memiliki karakteristik yang bisa ditulis');
}

async function attach(dev: BluetoothDevice): Promise<void> {
  const server = await dev.gatt!.connect();
  characteristic = await findWritableCharacteristic(server);
  device = dev;
  dev.addEventListener('gattserverdisconnected', () => { characteristic = null; });
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
