import { useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import * as bt from '@/services/btPrinter';

/**
 * Banner "Ketuk untuk hubungkan printer".
 *
 * Hanya muncul di browser yang TIDAK mendukung getDevices() (mode satu-tap),
 * saat ada printer tersimpan tapi belum tersambung. Karena requestDevice()
 * wajib user gesture yang fresh, koneksi harus dipicu tap langsung di banner ini
 * — bukan diselipkan di tengah flow "simpan & cetak" (gesture-nya sudah hangus
 * setelah await simpan ke server).
 *
 * Sekali tap saat buka app → printer tersambung untuk seluruh sesi.
 */
export function PrinterConnectBanner() {
  const { deviceId, deviceName, status, setDevice, setStatus } = usePrinterStore();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);

  // Tampil hanya saat: BT didukung, browser mode satu-tap, ada device tersimpan, belum tersambung
  const show = bt.isSupported() && !bt.canAutoReconnect() && !!deviceId && status !== 'connected';
  if (!show) return null;

  const handleConnect = async () => {
    setBusy(true);
    setStatus('connecting');
    try {
      const dev = await bt.connect();
      setDevice(dev.id, dev.name ?? deviceName ?? 'Printer');
      setStatus('connected');
      addToast(`${dev.name ?? deviceName} tersambung`, 'success');
    } catch (e) {
      setStatus('disconnected');
      // NotFoundError = user menutup dialog, bukan kegagalan nyata
      if (e instanceof Error && e.name !== 'NotFoundError') addToast('Gagal menghubungkan printer', 'error');
    } finally {
      setBusy(false);
    }
  };

  const connecting = status === 'connecting' || busy;

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="w-full flex items-center gap-3 px-4 py-2.5 mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100 transition-colors disabled:opacity-70"
    >
      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        {connecting
          ? <RefreshCw size={15} className="text-amber-600 animate-spin" />
          : <Printer size={15} className="text-amber-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-700">
          {connecting ? 'Menghubungkan printer...' : `Printer ${deviceName ?? ''} belum tersambung`}
        </p>
        <p className="text-[11px] text-amber-600/80">
          {connecting ? 'Pilih printer di dialog yang muncul' : 'Ketuk untuk menghubungkan'}
        </p>
      </div>
    </button>
  );
}
