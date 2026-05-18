import { useState, useRef, useEffect } from 'react';
import { Pencil, Ban, CheckCircle2, Trash2, UserCheck, X, Printer, Package, MoreVertical } from 'lucide-react';
import { cn } from '@/utils';

type ActionType = 'edit' | 'deactivate' | 'activate' | 'delete' | 'checkin' | 'cancel' | 'print' | 'stock';

interface ActionItem {
  action: ActionType;
  onClick: () => void;
  tooltip?: string;
}

const config: Record<ActionType, { icon: typeof Pencil; className: string; label: string }> = {
  edit: { icon: Pencil, className: 'text-zen-ink/70', label: 'Edit' },
  activate: { icon: CheckCircle2, className: 'text-emerald-600', label: 'Aktifkan' },
  deactivate: { icon: Ban, className: 'text-amber-600', label: 'Nonaktifkan' },
  delete: { icon: Trash2, className: 'text-red-500', label: 'Hapus' },
  checkin: { icon: UserCheck, className: 'text-emerald-600', label: 'Check-in' },
  cancel: { icon: X, className: 'text-red-500', label: 'Batal' },
  print: { icon: Printer, className: 'text-zen-ink/70', label: 'Cetak' },
  stock: { icon: Package, className: 'text-zen-ink/70', label: 'Stok' },
};

export function MoreMenu({ actions }: { actions: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Menu aksi"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-zen-ink/40 hover:text-zen-ink hover:bg-zen-brand/5 transition-all">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[160px] py-1 bg-white rounded-2xl shadow-xl border border-zen-ink/5 animate-in fade-in slide-in-from-top-1">
          {actions.map((a, i) => {
            const { icon: Icon, className, label } = config[a.action];
            return (
              <button key={i} type="button"
                onClick={() => { a.onClick(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zen-bg transition-colors">
                <Icon size={14} className={className} />
                <span className={cn('font-medium', className)}>{a.tooltip ?? label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Keep ActionButtons for backward compat but now just wraps MoreMenu
export function ActionButtons({ actions }: { actions: ActionItem[] }) {
  return <MoreMenu actions={actions} />;
}
