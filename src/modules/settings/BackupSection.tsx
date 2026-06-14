import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle, RefreshCw, ShieldOff, Database, CheckCircle2 } from 'lucide-react';

const TRANSAKSI_TABLES: { key: string; label: string }[] = [
  { key: 'bookings',          label: 'Peserta sesi (booking)' },
  { key: 'training_sessions', label: 'Jadwal sesi' },
  { key: 'product_sales',     label: 'Penjualan produk' },
  { key: 'member_payments',   label: 'Pembayaran paket member' },
  { key: 'coach_commissions', label: 'Komisi pelatih' },
  { key: 'member_packages',   label: 'Paket member (sisa sesi)' },
];

const MASTER_TABLES: { key: string; label: string }[] = [
  { key: 'members',  label: 'Data member' },
  { key: 'coaches',  label: 'Data pelatih' },
  { key: 'products', label: 'Produk' },
  { key: 'packages', label: 'Paket' },
];

type ResetPhase = 'idle' | 'deleting' | 'done';

export function BackupSection() {
  const authStudioId = useAuthStore(s => s.studioId);
  const queryClient  = useQueryClient();
  const addToast     = useToastStore(s => s.addToast);

  const [modalOpen, setModalOpen]   = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase]           = useState<ResetPhase>('idle');

  const canConfirm = confirmText.toUpperCase() === 'HAPUS';

  const handleReset = async () => {
    if (!authStudioId || !canConfirm) return;

    // tutup modal konfirmasi, tampilkan overlay blocking
    setModalOpen(false);
    setPhase('deleting');

    // Hapus semua data studio dalam satu transaksi (urutan FK benar, bypass RLS via RPC).
    const { error } = await supabase.rpc('reset_studio_data', { p_studio_id: authStudioId });
    if (error) {
      setPhase('idle');
      addToast('Gagal reset data: ' + error.message, 'error');
      return;
    }

    // hapus semua cache react-query agar data di semua halaman ikut kosong
    queryClient.clear();

    setPhase('done');
    setTimeout(() => {
      setPhase('idle');
      setConfirmText('');
    }, 2000);
  };

  const openModal  = () => { setConfirmText(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setConfirmText(''); };

  return (
    <>
      {/* ── Card Reset Data ── */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zen-ink/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <Database size={17} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold">Reset Semua Data</p>
            <p className="text-[10px] text-zen-ink/40 mt-0.5">Hapus seluruh data untuk memulai dari awal</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-2xl px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-red-500">Data Transaksi</p>
              <ul className="space-y-1.5">
                {TRANSAKSI_TABLES.map(t => (
                  <li key={t.key} className="flex items-center gap-2 text-xs text-red-700">
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-2xl px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-red-500">Data Master</p>
              <ul className="space-y-1.5">
                {MASTER_TABLES.map(t => (
                  <li key={t.key} className="flex items-center gap-2 text-xs text-red-700">
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={openModal}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-sm font-bold rounded-2xl min-h-[48px] transition-all"
          >
            <Trash2 size={15} />
            Hapus Semua Data
          </button>
        </div>
      </div>

      {/* ── Modal Konfirmasi ── */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/40"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-5 animate-slide-up sm:animate-page-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-1" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <ShieldOff size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-base font-bold">Konfirmasi Hapus</p>
                <p className="text-xs text-zen-ink/40">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>

            <div className="bg-red-50 rounded-2xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">
                Semua data transaksi <strong>dan</strong> data master (member, pelatih, produk, paket) akan <strong>dihapus permanen</strong>.
              </p>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">
                Ketik <span className="text-red-500 font-black">HAPUS</span> untuk lanjut
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="HAPUS"
                autoFocus
                className="w-full bg-zen-bg rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 ring-red-200 placeholder:text-zen-ink/20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 py-3.5 border border-zen-ink/10 text-zen-ink/60 text-sm font-bold rounded-2xl min-h-[48px]"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                disabled={!canConfirm}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Overlay Blocking — tampil selama proses & setelah selesai ── */}
      {phase !== 'idle' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zen-ink/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl px-8 py-8 w-72 flex flex-col items-center gap-5 shadow-2xl">
            {phase === 'deleting' ? (
              <>
                {/* Skeleton rows animasi */}
                <div className="w-full space-y-2.5">
                  {[...TRANSAKSI_TABLES, ...MASTER_TABLES].map((t, i) => (
                    <div key={t.key} className="flex items-center gap-3">
                      <div
                        className="h-2 bg-red-100 rounded-full animate-pulse"
                        style={{ width: `${62 + (i % 3) * 12}%`, animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 text-zen-ink/60">
                  <RefreshCw size={16} className="animate-spin text-red-400 shrink-0" />
                  <p className="text-sm font-semibold">Menghapus semua data...</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-bold">Selesai</p>
                  <p className="text-xs text-zen-ink/40">Semua data berhasil dihapus</p>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
