import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils';

// Button
export function Button({ children, variant = 'primary', size = 'md', className, disabled, onClick, type = 'button' }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg';
  className?: string; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' | 'reset';
}) {
  const variants = {
    primary: 'bg-zen-brand text-white hover:bg-zen-ink shadow-lg shadow-zen-brand/20',
    secondary: 'bg-zen-bg text-zen-ink border border-zen-ink/10 hover:bg-zen-ink hover:text-white',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-zen-ink/60 hover:bg-zen-brand/5 hover:text-zen-brand',
  };
  const sizes = { sm: 'px-4 py-2 text-[10px]', md: 'px-6 py-3 text-[10px]', lg: 'px-8 py-4 text-[10px]' };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={cn('rounded-2xl font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 active:scale-95', variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
}

// Input
export const Input = forwardRef<HTMLInputElement, { label?: string; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, className, ...rest }, ref) => (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">{label}</label>}
      <input ref={ref} {...rest} className={cn('w-full px-5 py-4 bg-zen-bg border-0 rounded-2xl focus:ring-2 focus:ring-zen-brand outline-none transition-all font-medium text-sm', error && 'ring-2 ring-red-400')} />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
);
Input.displayName = 'Input';

// Select
export const Select = forwardRef<HTMLSelectElement, { label?: string; error?: string; options: { value: string; label: string }[]; className?: string } & SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, error, options, className, ...rest }, ref) => (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">{label}</label>}
      <select ref={ref} {...rest} className={cn('w-full px-5 py-4 bg-zen-bg border-0 rounded-2xl focus:ring-2 focus:ring-zen-brand outline-none transition-all font-medium text-sm', error && 'ring-2 ring-red-400')}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
);
Select.displayName = 'Select';

// Card
export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <div className={cn('glass-card rounded-[32px] p-8', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-lg font-bold tracking-tight">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-zen-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full glass-card rounded-[32px] p-8 max-h-[90vh] overflow-y-auto', sizes[size])}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-zen-bg flex items-center justify-center text-zen-ink/40 hover:text-zen-ink transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// DataTable
export function DataTable({ columns, data, emptyMessage = 'Tidak ada data', onRowClick }: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[]; data: any[]; emptyMessage?: string; onRowClick?: (row: any) => void;
}) {
  if (!data.length) return <EmptyState title={emptyMessage} />;
  return (
    <>
      {/* Desktop/Tablet landscape: table */}
      <div className="hidden md:block overflow-x-auto glass-card rounded-[32px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zen-brand/5 text-[10px] uppercase tracking-[0.2em] font-bold text-zen-ink/40">
              {columns.map(c => <th key={c.key} className="px-6 py-4">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} className={cn('border-t border-zen-brand/5 h-16 hover:bg-zen-brand/5 transition-all', onRowClick && 'cursor-pointer')}>
                {columns.map(c => <td key={c.key} className="px-6 py-4 text-sm">{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {data.map((row, i) => (
          <div key={i} onClick={() => onRowClick?.(row)} className={cn('glass-card rounded-2xl p-4 space-y-2', onRowClick && 'cursor-pointer active:scale-[0.98] transition-transform')}>
            {columns.filter(c => c.key !== 'actions').map(c => (
              <div key={c.key} className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">{c.label}</span>
                <span className="text-sm font-medium text-right">{c.render ? c.render(row) : row[c.key]}</span>
              </div>
            ))}
            {columns.find(c => c.key === 'actions') && (
              <div className="pt-2 border-t border-zen-brand/5 flex gap-2 justify-end">
                {columns.find(c => c.key === 'actions')!.render!(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// DateRangeFilter
export function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange }: {
  startDate: string; endDate: string; onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-4 items-end">
      <Input type="date" label="Dari" value={startDate} onChange={e => onStartChange(e.target.value)} />
      <Input type="date" label="Sampai" value={endDate} onChange={e => onEndChange(e.target.value)} />
    </div>
  );
}

// EmptyState
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-zen-ink/20">{icon}</div>}
      <h3 className="text-lg font-bold text-zen-ink/40">{title}</h3>
      {description && <p className="mt-2 text-sm text-zen-ink/30 italic">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Badge
export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' }) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
    info: 'bg-zen-brand/10 text-zen-brand border-zen-brand/20',
    default: 'bg-zen-bg text-zen-ink/60 border-zen-ink/10',
  };
  return <span className={cn('inline-flex items-center rounded-full px-4 py-1.5 text-[9px] uppercase tracking-[0.2em] font-bold border', variants[variant])}>{children}</span>;
}

// StatCard
export function StatCard({ title, value, icon, trend }: { title: string; value: string | number; icon?: ReactNode; trend?: string }) {
  return (
    <div className="glass-card rounded-[32px] p-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">{title}</span>
        {icon && <div className="text-zen-brand/40">{icon}</div>}
      </div>
      <div className="text-3xl font-bold tracking-tighter">{value}</div>
      {trend && <span className="mt-1 text-xs text-emerald-500 font-medium">{trend}</span>}
    </div>
  );
}
