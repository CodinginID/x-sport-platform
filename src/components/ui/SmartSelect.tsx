import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';
import { Skeleton } from '@/components/Skeleton';

export interface SmartSelectOption {
  value: string;
  label: string;
}

export interface SmartSelectProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: SmartSelectOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropdown premium-aware.
 * - Tanpa fitur `pro` → native <select> identik dengan `Select` existing (tidak ada regresi).
 * - Dengan `pro` → tombol pemicu + panel dropdown searchable + skeleton saat loading.
 * onChange SELALU dipanggil dengan string value (seragam untuk kedua mode).
 */
export function SmartSelect({
  label,
  error,
  value,
  onChange,
  options,
  placeholder,
  loading = false,
  disabled = false,
  className,
}: SmartSelectProps) {
  const isPro = useFeature('pro');

  // ── Mode native (tanpa pro): identik dengan Select existing ──
  if (!isPro) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && <label className="text-xs uppercase tracking-[0.2em] font-bold opacity-60">{label}</label>}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn('w-full px-4 py-3 bg-zen-bg border border-transparent rounded-2xl focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20 outline-none transition-all font-medium text-sm disabled:opacity-50', error && 'border-red-400 ring-2 ring-red-400/20')}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    );
  }

  // ── Mode pro: dropdown searchable + skeleton ──
  return (
    <SmartSelectPro
      label={label}
      error={error}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
      className={className}
    />
  );
}

function SmartSelectPro({
  label,
  error,
  value,
  onChange,
  options,
  placeholder,
  loading,
  disabled,
  className,
}: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Tutup saat klik luar
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Fokus search saat panel terbuka
  useEffect(() => {
    if (open) {
      setQuery('');
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)} ref={rootRef}>
      {label && <label className="text-xs uppercase tracking-[0.2em] font-bold opacity-60">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-invalid={!!error}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen(o => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-4 py-3 bg-zen-bg border border-transparent rounded-2xl outline-none transition-all font-medium text-sm text-left disabled:opacity-50',
            open ? 'border-zen-brand ring-2 ring-zen-brand/20' : 'focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20',
            error && 'border-red-400 ring-2 ring-red-400/20',
          )}
        >
          <span className={cn('truncate', !selected && 'text-zen-ink/40')}>
            {selected ? selected.label : (placeholder ?? 'Pilih...')}
          </span>
          <ChevronDown size={16} className={cn('shrink-0 text-zen-ink/40 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-zen-ink/10 rounded-2xl shadow-2xl shadow-zen-ink/10 overflow-hidden animate-fade-in">
            {/* Search */}
            <div className="p-2 border-b border-zen-ink/5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zen-bg border border-transparent rounded-xl focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20 outline-none placeholder:text-zen-ink/30"
                />
              </div>
            </div>

            {/* Daftar / Skeleton */}
            <div className="max-h-60 overflow-y-auto p-1.5">
              {loading ? (
                <div className="space-y-1.5 p-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-zen-ink/40">Tidak ada hasil</div>
              ) : (
                filtered.map(o => {
                  const active = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => handleSelect(o.value)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors',
                        active ? 'bg-zen-brand/10 text-zen-brand font-bold' : 'hover:bg-zen-bg text-zen-ink',
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {active && <Check size={15} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

export default SmartSelect;
