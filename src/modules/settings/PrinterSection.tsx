import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { Printer, Bluetooth, BluetoothConnected, AlertTriangle } from 'lucide-react';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import * as bt from '@/services/btPrinter';
import { buildTestReceipt } from '@/services/escpos';
import type { PaperSize } from '@/services/escpos';

export function PrinterSection() {
  const { deviceName, paperSize, autoPrint, status, setPaperSize, setAutoPrint, setDevice, forgetDevice, setStatus } = usePrinterStore();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const supported = bt.isSupported();

  if (!supported) {
    return (
      <Card title="Printer Bluetooth">
        <div className="flex items-start gap-3 text-sm text-zen-ink/60">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p>Cetak Bluetooth tidak didukung di perangkat/browser ini (mis. iOS/Safari). Gunakan Chrome/Edge di Android atau desktop. Struk tetap bisa dicetak via PDF.</p>
        </div>
      </Card>
    );
  }

  const handleConnect = async () => {
    setBusy(true);
    try {
      setStatus('connecting');
      const dev = await bt.connect();
      setDevice(dev.id, dev.name ?? 'Printer');
      setStatus('connected');
      addToast('Printer terhubung', 'success');
    } catch {
      setStatus('disconnected');
      addToast('Gagal menghubungkan printer', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      if (!bt.isConnected()) {
        const dev = await bt.connect();
        setDevice(dev.id, dev.name ?? 'Printer');
      }
      await bt.print(buildTestReceipt(paperSize));
      setStatus('connected');
      addToast('Test print terkirim', 'success');
    } catch (e) {
      console.error('[print] test print gagal:', e);
      addToast(`Gagal test print: ${e instanceof Error ? e.message : 'kesalahan tak dikenal'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleForget = () => { bt.disconnect(); forgetDevice(); addToast('Printer dilupakan', 'info'); };

  return (
    <Card title="Printer Bluetooth">
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {status === 'connected'
            ? <BluetoothConnected size={18} className="text-green-500 shrink-0" />
            : <Bluetooth size={18} className="text-zen-ink/40 shrink-0" />}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Status</div>
            <div className="font-bold text-sm">
              {deviceName ? `${deviceName} • ${status === 'connected' ? 'Terhubung' : 'Tersimpan'}` : 'Belum ada printer'}
            </div>
          </div>
        </div>

        {/* Paper size */}
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Ukuran Kertas</div>
          <div className="flex gap-2">
            {(['58', '80'] as PaperSize[]).map((p) => (
              <button key={p} onClick={() => setPaperSize(p)}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${paperSize === p ? 'bg-zen-brand text-white' : 'bg-zen-bg text-zen-ink/50'}`}>
                {p}mm
              </button>
            ))}
          </div>
        </div>

        {/* Auto print */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Cetak otomatis saat transaksi selesai</span>
          <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)}
            className="w-5 h-5 accent-zen-brand" />
        </label>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleConnect} disabled={busy} className="flex-1">
            <Printer size={14} /> {deviceName ? 'Ganti Printer' : 'Hubungkan Printer'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={busy}>Test Print</Button>
          {deviceName && <Button size="sm" variant="secondary" onClick={handleForget}>Lupakan</Button>}
        </div>
      </div>
    </Card>
  );
}
