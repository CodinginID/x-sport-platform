import { useState, useRef } from 'react';
import { useBackupStore } from '@/stores/backup';
import { performBackup, performRestore, exportToFile, importFromFile } from '@/utils/backup';
import { Card, Button, Input, Modal } from '@/components/ui';
import { Cloud, Download, Upload, RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react';
import { formatDateTime } from '@/utils';

export function BackupSection() {
  const { studioId, pin, lastBackupAt, autoBackupEnabled, isBackingUp, setAutoBackup } = useBackupStore();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreId, setRestoreId] = useState('');
  const [restorePin, setRestorePin] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const fileRef = useRef<HTMLInputElement>(null);

  // Track online status
  useState(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
  });

  const handleBackup = async () => {
    const ok = await performBackup();
    setMessage(ok ? '✅ Backup cloud berhasil!' : '❌ Backup gagal. Cek koneksi internet.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await performRestore(restoreId, restorePin);
    setRestoring(false);
    if (ok) { setRestoreOpen(false); setMessage('✅ Data berhasil di-restore!'); setTimeout(() => window.location.reload(), 1000); }
    else setMessage('❌ Restore gagal. Cek Studio ID dan PIN.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await importFromFile(file);
    setMessage(ok ? '✅ Import berhasil!' : '❌ Import gagal.');
    if (ok) setTimeout(() => window.location.reload(), 1000);
    else setTimeout(() => setMessage(''), 3000);
  };

  return (
    <>
      <Card title="💾 Backup & Restore">
        {/* Online status */}
        <div className="flex items-center gap-2 mb-5">
          {online ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-red-400" />}
          <span className="text-xs font-medium text-zen-ink/50">{online ? 'Online — cloud backup tersedia' : 'Offline — backup otomatis saat kembali online'}</span>
        </div>

        {/* Credentials */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center py-2 border-b border-zen-brand/5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Studio ID</span>
            <span className="font-mono font-bold text-sm">{studioId || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zen-brand/5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">PIN</span>
            <span className="font-mono font-bold text-sm">{pin || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zen-brand/5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Backup Terakhir</span>
            <span className="text-sm">{lastBackupAt ? formatDateTime(lastBackupAt) : 'Belum pernah'}</span>
          </div>
        </div>

        {/* Auto backup toggle */}
        <label className="flex items-center justify-between py-3 border-b border-zen-brand/5 cursor-pointer mb-5">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-zen-brand" />
            <span className="text-sm font-medium">Auto Backup saat online</span>
          </div>
          <input type="checkbox" checked={autoBackupEnabled} onChange={e => setAutoBackup(e.target.checked)} className="rounded" />
        </label>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Cloud</span>
            <Button size="sm" onClick={handleBackup} disabled={isBackingUp || !studioId || !online} className="w-full justify-center">
              <RefreshCw size={14} className={isBackingUp ? 'animate-spin mr-2' : 'mr-2'} />
              {isBackingUp ? 'Uploading...' : 'Backup Cloud'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRestoreOpen(true)} disabled={!online} className="w-full justify-center">
              <Download size={14} className="mr-2" /> Restore Cloud
            </Button>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Lokal</span>
            <Button size="sm" variant="secondary" onClick={exportToFile} className="w-full justify-center">
              <Download size={14} className="mr-2" /> Export JSON
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} className="w-full justify-center">
              <Upload size={14} className="mr-2" /> Import JSON
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {/* Note */}
        <div className="mt-4 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
          <Shield size={12} className="inline mr-1" />
          Simpan Studio ID & PIN. Diperlukan untuk restore di device baru. Data di-enkripsi sebelum upload.
        </div>

        {message && <div className="mt-3 text-sm font-medium">{message}</div>}
      </Card>

      {/* Restore modal */}
      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore dari Cloud">
        <div className="space-y-4">
          <p className="text-sm text-zen-ink/60">Masukkan Studio ID dan PIN untuk mengambil data dari cloud.</p>
          <Input label="Studio ID" placeholder="XSP-XXXXX" value={restoreId} onChange={e => setRestoreId(e.target.value.toUpperCase())} />
          <Input label="PIN" placeholder="1234" type="password" value={restorePin} onChange={e => setRestorePin(e.target.value)} />
          <Button onClick={handleRestore} className="w-full" disabled={restoring || !restoreId || !restorePin}>
            {restoring ? 'Restoring...' : 'Restore Data'}
          </Button>
          <p className="text-[10px] text-red-400 text-center">⚠️ Ini akan mengganti semua data lokal dengan data dari cloud.</p>
        </div>
      </Modal>
    </>
  );
}
