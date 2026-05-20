import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  show: (opts: { title: string; message: string; variant?: 'danger' | 'warning'; onConfirm: () => void }) => void;
  hide: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  open: false,
  title: '',
  message: '',
  variant: 'danger',
  onConfirm: () => {},
  show: (opts) => set({ open: true, title: opts.title, message: opts.message, variant: opts.variant || 'danger', onConfirm: opts.onConfirm }),
  hide: () => set({ open: false }),
}));

export function ConfirmDialogProvider() {
  const { open, title, message, variant, onConfirm, hide } = useConfirmStore();
  if (!open) return null;

  const handleConfirm = () => { onConfirm(); hide(); };

  const isDanger = variant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="alertdialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zen-ink/50 backdrop-blur-sm animate-fade-in-bg"
        onClick={hide}
      />

      {/* ── Mobile: bottom sheet ── */}
      <div className="md:hidden absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] animate-slide-up shadow-2xl">
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-9 h-1 bg-zen-ink/10 rounded-full" />
        </div>
        <div className="px-6 pb-8 space-y-5">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDanger ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isDanger
              ? <Trash2 size={20} className="text-red-500" />
              : <AlertTriangle size={20} className="text-amber-500" />
            }
          </div>
          <div>
            <h2 className="text-base font-bold mb-1">{title}</h2>
            <p className="text-sm text-zen-ink/50">{message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={hide}
              className="flex-1 py-3.5 rounded-2xl text-[11px] uppercase tracking-widest font-bold bg-zen-bg text-zen-ink/60 hover:bg-zen-ink/10 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3.5 rounded-2xl text-[11px] uppercase tracking-widest font-bold text-white transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              Konfirmasi
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop: centered dialog ── */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center p-6">
        <div
          className="relative bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl shadow-zen-ink/10 animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={hide}
            className="absolute top-5 right-5 w-8 h-8 rounded-2xl bg-zen-bg flex items-center justify-center text-zen-ink/30 hover:text-zen-ink transition-colors"
          >
            <X size={14} />
          </button>

          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${isDanger ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isDanger
              ? <Trash2 size={20} className="text-red-500" />
              : <AlertTriangle size={20} className="text-amber-500" />
            }
          </div>

          <h2 className="text-lg font-bold mb-2">{title}</h2>
          <p className="text-sm text-zen-ink/50 mb-6">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={hide}
              className="flex-1 py-3 rounded-2xl text-[11px] uppercase tracking-widest font-bold bg-zen-bg text-zen-ink/60 hover:bg-zen-ink/10 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 rounded-2xl text-[11px] uppercase tracking-widest font-bold text-white transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}
            >
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
