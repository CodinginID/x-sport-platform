import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { cn } from '@/utils';

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

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={hide}>
      <div className="glass-card rounded-[24px] p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-zen-ink/60">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={hide} className="px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-2xl border border-zen-ink/10 hover:bg-zen-bg min-h-[44px]">
            Batal
          </button>
          <button onClick={handleConfirm}
            className={cn('px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-2xl text-white min-h-[44px]', variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600')}>
            Konfirmasi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
