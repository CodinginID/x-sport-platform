import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function DetailSheet({ open, onClose, title, subtitle, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zen-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-white sm:rounded-[28px] rounded-t-[28px] max-h-[90dvh] flex flex-col animate-slide-up sm:animate-page-in overflow-hidden">
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-4 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate">{title}</p>
            {subtitle && <p className="text-xs text-zen-ink/40 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-ink/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-ink transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pb-6 space-y-4 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Baris info dalam detail sheet */
export function DetailRow({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zen-ink/5 last:border-0">
      <span className="text-xs text-zen-ink/40 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${accent ? 'text-zen-brand' : 'text-zen-ink'}`}>{value}</span>
    </div>
  );
}

/** Section header dalam detail sheet */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-2">{title}</p>
      <div className="bg-zen-bg rounded-2xl px-4">{children}</div>
    </div>
  );
}
