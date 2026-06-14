import { useState } from 'react';
import {
  Printer, Bluetooth, BluetoothConnected, AlertTriangle,
  RefreshCw, Trash2, Zap, CheckCircle2, WifiOff,
  ScanBarcode, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import * as bt from '@/services/btPrinter';
import { buildTestReceipt } from '@/services/escpos';
import type { PaperSize } from '@/services/escpos';

// ─── Generic collapsible device card shell ────────────────────────────────────

function DeviceCard({
  icon: Icon,
  iconBg,
  title,
  statusLabel,
  statusColor,
  deviceName,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  statusLabel: string;
  statusColor: string; // tailwind text color class
  deviceName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
      {/* Compact header — selalu tampil */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zen-bg/60 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zen-ink">{title}</p>
          <p className={`text-[11px] font-medium mt-0.5 flex items-center gap-1.5 ${statusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusColor.replace('text-', 'bg-')}`} />
            {deviceName ? `${deviceName} · ${statusLabel}` : statusLabel}
          </p>
        </div>
        {open
          ? <ChevronUp size={16} className="text-zen-ink/25 shrink-0" />
          : <ChevronDown size={16} className="text-zen-ink/25 shrink-0" />}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-zen-ink/5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Printer Card ─────────────────────────────────────────────────────────────

function PrinterCard() {
  const {
    deviceId, deviceName, paperSize, autoPrint, status, isSearching, isPermissionLost,
    setPaperSize, setAutoPrint, setDevice, forgetDevice, setStatus, setSearching, setPermissionLost,
  } = usePrinterStore();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const supported = bt.isSupported();
  // Browser tanpa getDevices() (flag Chrome non-aktif) tak bisa auto-connect —
  // pakai mode "satu-tap": user ketuk tombol → dialog pemilihan → connect.
  const canAuto = bt.canAutoReconnect();

  const handlePairNew = async () => {
    setBusy(true);
    setSearching(false); // stop searching UI saat dialog pair dibuka
    try {
      setStatus('connecting');
      const dev = await bt.connect();
      setDevice(dev.id, dev.name ?? 'Printer');
      setStatus('connected');
      addToast(`${dev.name ?? 'Printer'} terhubung & dikunci`, 'success');
    } catch (e) {
      setStatus('disconnected');
      const err = e instanceof Error ? e : new Error(String(e));
      // Beri feedback yang jelas — jangan diam saja.
      if (err.name === 'NotFoundError') {
        addToast('Tidak ada printer dipilih / Bluetooth mati. Pastikan Bluetooth Mac aktif lalu coba lagi.', 'warning');
      } else if (err.name === 'SecurityError') {
        addToast('Bluetooth diblokir browser. Buka via localhost/https & izinkan Bluetooth untuk Chrome di System Settings.', 'error');
      } else {
        addToast(`Gagal menghubungkan printer: ${err.message}`, 'error');
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
      // Mode satu-tap (browser tanpa getDevices): tombol ini = user gesture,
      // jadi boleh panggil requestDevice() lewat connect() dengan dialog ter-filter nama.
      if (!canAuto) {
        const dev = await bt.connect();
        setDevice(dev.id, dev.name ?? deviceName ?? 'Printer');
        setStatus('connected');
        addToast(`${dev.name ?? deviceName} terhubung kembali`, 'success');
        return;
      }
      const result = await bt.reconnect(deviceId, deviceName);
      if (result === 'connected') {
        setStatus('connected');
        addToast(`${deviceName} terhubung kembali`, 'success');
      } else if (result === 'permission_lost') {
        setStatus('disconnected');
        setSearching(false);
        setPermissionLost(true);
      } else {
        setStatus('disconnected');
        addToast('Printer tidak terjangkau — pastikan printer menyala & coba lagi', 'warning');
      }
    } catch (e) {
      setStatus('disconnected');
      // NotFoundError = user menutup dialog, bukan error nyata
      if (e instanceof Error && e.name !== 'NotFoundError') addToast('Gagal reconnect', 'error');
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

  // Mode satu-tap aktif: ada device tersimpan tapi browser tak bisa auto-connect
  const oneTapMode = hasSaved && !canAuto;

  // Status untuk header compact
  const statusLabel = isConnected
    ? 'Terhubung'
    : isConnecting
    ? 'Menghubungkan...'
    : isPermissionLost
    ? 'Perlu pair ulang'
    : isSearching
    ? 'Mencari printer...'
    : oneTapMode
    ? 'Ketuk untuk hubungkan'
    : hasSaved
    ? 'Terputus'
    : 'Belum dipasang';
  const statusColor = isConnected
    ? 'text-green-500'
    : isPermissionLost
    ? 'text-red-400'
    : isConnecting || isSearching
    ? 'text-zen-brand'
    : hasSaved
    ? 'text-amber-500'
    : 'text-zen-ink/30';
  const iconBg = isConnected
    ? 'bg-green-50 text-green-600'
    : isPermissionLost
    ? 'bg-red-50 text-red-400'
    : (isSearching || isConnecting)
    ? 'bg-zen-brand/10 text-zen-brand'
    : hasSaved
    ? 'bg-amber-50 text-amber-500'
    : 'bg-zen-bg text-zen-ink/40';

  if (!supported) {
    return (
      <DeviceCard
        icon={Printer} iconBg="bg-zen-bg text-zen-ink/30"
        title="Printer Struk" statusLabel="Tidak didukung" statusColor="text-zen-ink/30"
        defaultOpen
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-zen-ink/50 leading-relaxed">
            Gunakan Chrome atau Edge di Android/desktop. Struk tetap bisa dicetak via PDF.
          </p>
        </div>
      </DeviceCard>
    );
  }

  return (
    <DeviceCard
      icon={isConnected ? BluetoothConnected : Printer}
      iconBg={iconBg}
      title="Printer Struk"
      statusLabel={statusLabel}
      statusColor={statusColor}
      deviceName={deviceName}
      defaultOpen={!isConnected} // expand otomatis kalau belum/terputus
    >
      {/* Permission lost — browser lupa izin, harus pair ulang sekali */}
      {isPermissionLost && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
            <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-600">Browser lupa izin printer</p>
              <p className="text-xs text-red-400 mt-0.5 leading-relaxed">
                Izin Bluetooth di browser hilang (mungkin karena hapus data browser atau reinstall). Pair sekali lagi — setelah itu akan terkunci seperti sebelumnya.
              </p>
            </div>
          </div>
          <button
            onClick={handlePairNew}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-60"
          >
            <Bluetooth size={15} /> Pair Ulang ke {deviceName}
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!isPermissionLost && isConnected ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleTest} disabled={busy} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors disabled:opacity-50">
            <Zap size={13} /> Test Print
          </button>
          <button onClick={handlePairNew} disabled={busy} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zen-bg hover:bg-zen-brand/10 text-zen-ink/60 hover:text-zen-brand text-xs font-bold transition-colors disabled:opacity-50">
            <RefreshCw size={13} /> Ganti
          </button>
          <button onClick={handleForget} disabled={busy} className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors">
            <Trash2 size={13} /> Lupakan Printer
          </button>
        </div>
      ) : hasSaved && !isPermissionLost ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleReconnect} disabled={busy || isConnecting} className="col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {isConnecting
              ? <><RefreshCw size={14} className="animate-spin" /> Menghubungkan...</>
              : isSearching
              ? <><RefreshCw size={14} className="animate-spin" /> Mencari otomatis...</>
              : <><BluetoothConnected size={14} /> Hubungkan {deviceName}</>}
          </button>
          <button onClick={handlePairNew} disabled={busy || isConnecting} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zen-bg hover:bg-zen-brand/10 text-zen-ink/60 hover:text-zen-brand text-xs font-bold transition-colors disabled:opacity-50">
            <Bluetooth size={13} /> Pair Baru
          </button>
          <button onClick={handleForget} disabled={isConnecting} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors">
            <Trash2 size={13} /> Lupakan
          </button>
        </div>
      ) : !isPermissionLost ? (
        <button onClick={handlePairNew} disabled={busy || isConnecting} className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-60">
          {isConnecting
            ? <><RefreshCw size={15} className="animate-spin" /> Mencari printer...</>
            : <><Printer size={15} /> Scan &amp; Hubungkan Printer</>}
        </button>
      ) : null}

      {/* Settings */}
      <div className="space-y-3.5 pt-1 border-t border-zen-ink/5">
        {/* Paper size */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-2">Ukuran Kertas</p>
          <div className="flex gap-2">
            {(['58', '80'] as PaperSize[]).map((p) => (
              <button key={p} onClick={() => setPaperSize(p)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${paperSize === p ? 'bg-zen-brand text-white' : 'bg-zen-bg text-zen-ink/40 hover:text-zen-ink'}`}>
                {p}mm
              </button>
            ))}
          </div>
        </div>

        {/* Auto print */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zen-ink">Cetak otomatis</p>
            <p className="text-[11px] text-zen-ink/40">Langsung cetak saat transaksi selesai</p>
          </div>
          <div onClick={() => setAutoPrint(!autoPrint)} className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors shrink-0 ${autoPrint ? 'bg-zen-brand' : 'bg-zen-ink/15'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="flex items-center gap-2 text-[11px] text-green-600 font-medium -mt-1">
          <CheckCircle2 size={12} />
          <span>Printer terkunci · reconnect otomatis saat printer menyala</span>
        </div>
      )}
      {hasSaved && !isConnected && !isConnecting && !oneTapMode && (
        <div className={`flex items-center gap-2 text-[11px] -mt-1 ${isSearching ? 'text-zen-brand' : 'text-zen-ink/40'}`}>
          {isSearching
            ? <><RefreshCw size={12} className="animate-spin shrink-0" /><span>Mencari printer secara otomatis...</span></>
            : <><WifiOff size={12} className="shrink-0" /><span>Printer tidak dalam jangkauan</span></>
          }
        </div>
      )}
      {oneTapMode && !isConnected && !isConnecting && (
        <div className="flex items-start gap-2 text-[11px] -mt-1 text-zen-ink/40 leading-relaxed">
          <Bluetooth size={12} className="shrink-0 mt-0.5 text-zen-brand" />
          <span>
            Ketuk <b className="text-zen-ink/60">Hubungkan {deviceName}</b> tiap buka aplikasi.
            Untuk koneksi otomatis penuh, aktifkan <code className="px-1 py-0.5 rounded bg-zen-bg text-[10px]">chrome://flags/#enable-web-bluetooth-new-permissions-backend</code> lalu restart browser.
          </span>
        </div>
      )}
    </DeviceCard>
  );
}

// ─── Coming Soon Card ─────────────────────────────────────────────────────────

function ComingSoonCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-3xl border border-dashed border-zen-ink/8 bg-zen-bg/30 opacity-50">
      <div className="w-10 h-10 rounded-2xl bg-zen-ink/5 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-zen-ink/25" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zen-ink/40 flex items-center gap-2">
          {title}
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-zen-ink/8 text-zen-ink/30">Soon</span>
        </p>
        <p className="text-[11px] text-zen-ink/25 mt-0.5">{description}</p>
      </div>
      <Lock size={13} className="text-zen-ink/15 shrink-0" />
    </div>
  );
}

// ─── Devices Section ──────────────────────────────────────────────────────────

export function DevicesSection() {
  return (
    <div className="space-y-3">
      <PrinterCard />
      <ComingSoonCard
        icon={ScanBarcode}
        title="Barcode Scanner"
        description="Scan member card & produk via Bluetooth"
      />
    </div>
  );
}
