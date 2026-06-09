import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';
import { Printer, Bluetooth, BluetoothConnected, AlertTriangle, RefreshCw, Trash2, Zap, CheckCircle2, WifiOff } from 'lucide-react';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import * as bt from '@/services/btPrinter';
import { buildTestReceipt } from '@/services/escpos';
import type { PaperSize } from '@/services/escpos';

export function PrinterSection() {
  const { deviceId, deviceName, paperSize, autoPrint, status, setPaperSize, setAutoPrint, setDevice, forgetDevice, setStatus } = usePrinterStore();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const [autoReconnectDone, setAutoReconnectDone] = useState(false);
  const supported = bt.isSupported();

  // Auto-reconnect ke device tersimpan saat pertama kali mount
  useEffect(() => {
    if (!supported || !deviceId || autoReconnectDone) return;
    setAutoReconnectDone(true);
    bt.reconnect(deviceId).then((ok) => {
      if (ok) {
        setStatus('connected');
      }
    });
  }, [deviceId, supported, autoReconnectDone, setStatus]);

  if (!supported) {
    return (
      <Card title="Printer Bluetooth">
        <div className="flex items-start gap-3 p-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-zen-ink">Bluetooth tidak didukung</p>
            <p className="text-xs text-zen-ink/50 mt-1 leading-relaxed">
              Cetak Bluetooth tidak didukung di perangkat/browser ini (iOS/Safari). Gunakan Chrome atau Edge di Android/desktop. Struk tetap bisa dicetak via PDF.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const handlePairNew = async () => {
    setBusy(true);
    try {
      setStatus('connecting');
      const dev = await bt.connect();
      setDevice(dev.id, dev.name ?? 'Printer');
      setStatus('connected');
      addToast(`${dev.name ?? 'Printer'} terhubung`, 'success');
    } catch (e) {
      setStatus(deviceId ? 'disconnected' : 'disconnected');
      if (e instanceof Error && e.name !== 'NotFoundError') {
        addToast('Gagal menghubungkan printer', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    if (!deviceId) return;
    setBusy(true);
    setStatus('connecting');
    try {
      const ok = await bt.reconnect(deviceId);
      if (ok) {
        setStatus('connected');
        addToast(`${deviceName} terhubung kembali`, 'success');
      } else {
        setStatus('disconnected');
        addToast('Tidak bisa reconnect otomatis — coba "Pair Ulang"', 'warning');
      }
    } catch {
      setStatus('disconnected');
      addToast('Gagal reconnect', 'error');
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
        setStatus('connected');
      }
      await bt.print(buildTestReceipt(paperSize));
      addToast('Test print terkirim', 'success');
    } catch (e) {
      addToast(`Gagal test print: ${e instanceof Error ? e.message : 'kesalahan tak dikenal'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleForget = () => {
    bt.disconnect();
    forgetDevice();
    addToast('Printer dihapus', 'info');
  };

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const hasSaved = !!deviceId;

  return (
    <Card title="Printer Bluetooth">
      <div className="space-y-5">

        {/* ── Status Hero ── */}
        <div className={`rounded-3xl p-4 transition-all duration-500 ${
          isConnected
            ? 'bg-green-50 border border-green-200'
            : isConnecting
            ? 'bg-zen-brand/5 border border-zen-brand/20'
            : hasSaved
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-zen-bg border border-zen-ink/5'
        }`}>
          <div className="flex items-center gap-4">
            {/* Icon + animation */}
            <div className={`relative w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 transition-colors ${
              isConnected ? 'bg-green-500' : isConnecting ? 'bg-zen-brand' : hasSaved ? 'bg-amber-400' : 'bg-zen-ink/10'
            }`}>
              {isConnecting && (
                <>
                  <span className="absolute inset-0 rounded-3xl bg-zen-brand/40 animate-ping" />
                  <span className="absolute inset-[-6px] rounded-[1.75rem] border-2 border-zen-brand/30 animate-pulse" />
                </>
              )}
              {isConnected
                ? <BluetoothConnected size={22} className="text-white" />
                : isConnecting
                ? <Bluetooth size={22} className="text-white animate-pulse" />
                : hasSaved
                ? <WifiOff size={20} className="text-white" />
                : <Bluetooth size={22} className="text-zen-ink/30" />
              }
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${
                isConnected ? 'text-green-600' : isConnecting ? 'text-zen-brand' : hasSaved ? 'text-amber-600' : 'text-zen-ink/30'
              }`}>
                {isConnected ? 'Terhubung' : isConnecting ? 'Menghubungkan...' : hasSaved ? 'Terputus' : 'Belum dipasang'}
              </p>
              <p className="text-sm font-bold text-zen-ink truncate">
                {deviceName ?? 'Tidak ada printer'}
              </p>
              {isConnecting && (
                <p className="text-[11px] text-zen-brand/70 mt-0.5 animate-pulse">Mencari perangkat...</p>
              )}
              {!isConnecting && hasSaved && !isConnected && (
                <p className="text-[11px] text-amber-600/70 mt-0.5">Terakhir terhubung · tap Reconnect</p>
              )}
            </div>

            {/* Live indicator */}
            {isConnected && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-700">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons (berdasarkan state) ── */}
        <div className="space-y-2">
          {isConnected ? (
            /* Connected: test print + scan baru + forget */
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTest}
                disabled={busy}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Zap size={13} /> Test Print
              </button>
              <button
                onClick={handlePairNew}
                disabled={busy}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zen-bg hover:bg-zen-brand/10 text-zen-ink/60 hover:text-zen-brand text-xs font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} /> Ganti Printer
              </button>
              <button
                onClick={handleForget}
                disabled={busy}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors"
              >
                <Trash2 size={13} /> Lupakan Printer
              </button>
            </div>
          ) : hasSaved ? (
            /* Saved tapi disconnected: reconnect utama, pair baru, forget */
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleReconnect}
                disabled={busy || isConnecting}
                className="col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isConnecting
                  ? <><RefreshCw size={14} className="animate-spin" /> Menghubungkan...</>
                  : <><BluetoothConnected size={14} /> Reconnect ke {deviceName}</>
                }
              </button>
              <button
                onClick={handlePairNew}
                disabled={busy || isConnecting}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zen-bg hover:bg-zen-brand/10 text-zen-ink/60 hover:text-zen-brand text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Bluetooth size={13} /> Pair Baru
              </button>
              <button
                onClick={handleForget}
                disabled={isConnecting}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors"
              >
                <Trash2 size={13} /> Lupakan
              </button>
            </div>
          ) : (
            /* Belum ada printer sama sekali */
            <button
              onClick={handlePairNew}
              disabled={busy || isConnecting}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-60"
            >
              {isConnecting
                ? <><RefreshCw size={15} className="animate-spin" /> Mencari printer...</>
                : <><Printer size={15} /> Scan &amp; Hubungkan Printer</>
              }
            </button>
          )}
        </div>

        {/* ── Pengaturan ── */}
        <div className="space-y-4 pt-1 border-t border-zen-ink/5">
          {/* Paper size */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Ukuran Kertas</div>
            <div className="flex gap-2">
              {(['58', '80'] as PaperSize[]).map((p) => (
                <button key={p} onClick={() => setPaperSize(p)}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    paperSize === p
                      ? 'bg-zen-brand text-white shadow-sm'
                      : 'bg-zen-bg text-zen-ink/50 hover:text-zen-ink'
                  }`}>
                  {p}mm
                </button>
              ))}
            </div>
          </div>

          {/* Auto print toggle */}
          <label className="flex items-center justify-between cursor-pointer gap-4">
            <div>
              <p className="text-sm font-medium text-zen-ink">Cetak otomatis</p>
              <p className="text-[11px] text-zen-ink/40 mt-0.5">Langsung cetak saat transaksi selesai</p>
            </div>
            <div
              onClick={() => setAutoPrint(!autoPrint)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${autoPrint ? 'bg-zen-brand' : 'bg-zen-ink/15'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>

        {/* Connected checkmark footer */}
        {isConnected && (
          <div className="flex items-center gap-2 text-[11px] text-green-600 font-medium">
            <CheckCircle2 size={13} />
            <span>Printer siap menerima data cetak</span>
          </div>
        )}
      </div>
    </Card>
  );
}
