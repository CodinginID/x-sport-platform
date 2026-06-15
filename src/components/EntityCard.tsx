import { QRCodeSVG } from 'qrcode.react';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export interface EntityCardInfoRow {
  label: string;
  value: string;
}

interface Props {
  variant: 'member' | 'coach';
  studioName: string;
  name: string;
  subtitle?: string;
  infoRows?: EntityCardInfoRow[];
  qrValue: string;
}

/**
 * Kartu ID reusable (member & coach) — read-only/presentational.
 * Header nama studio, avatar inisial, nama besar, subtitle (ID dipersingkat),
 * baris info, dan QR (value = qrValue).
 */
export function EntityCard({ variant, studioName, name, subtitle, infoRows = [], qrValue }: Props) {
  const variantLabel = variant === 'member' ? 'Member Card' : 'Coach Card';

  return (
    <div className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden text-white shadow-xl shadow-zen-brand/20 bg-gradient-to-br from-zen-brand via-zen-brand to-zen-accent">
      {/* Decorative glow */}
      <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />

      <div className="relative p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-tight truncate">{studioName}</p>
          <span className="text-[9px] uppercase tracking-widest font-bold bg-white/20 px-2.5 py-1 rounded-full shrink-0">
            {variantLabel}
          </span>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white font-black text-lg flex items-center justify-center shrink-0">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight truncate">{name}</p>
            {subtitle && <p className="text-xs text-white/70 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Info + QR */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {infoRows.map((row, i) => (
              <div key={i} className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest font-bold text-white/50">{row.label}</p>
                <p className="text-xs font-semibold truncate">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-2 shrink-0">
            <QRCodeSVG value={qrValue} size={84} bgColor="#ffffff" fgColor="#0F172A" level="M" />
          </div>
        </div>
      </div>
    </div>
  );
}
