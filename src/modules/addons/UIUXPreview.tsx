import { useState, useEffect } from 'react';
import { Search, ChevronDown, Sparkles, Loader2 } from 'lucide-react';

const COACHES = ['Coach Budi', 'Coach Sinta', 'Coach Agnes', 'Coach Dian', 'Coach Rina', 'Coach Fajar'];
const PACKAGES = ['Reguler 8x', 'Reguler 4x', 'Private 12x', 'Private 4x', 'Drop-in', 'Paket Trial'];

/** Searchable select premium (dummy). */
function SearchableSelectDemo() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const items = COACHES.filter(c => c.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Searchable Select</p>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Cari coach..."
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand pr-10"
        />
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-ink/30" />
        {open && query.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-zen-ink/10 rounded-2xl shadow-lg overflow-hidden">
            {items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-zen-ink/30">Tidak ditemukan</p>
            ) : (
              items.map(c => (
                <button key={c} className="w-full text-left px-4 py-2.5 text-sm hover:bg-zen-brand/5 transition-colors">
                  {c}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton loading premium (dummy animasi). */
function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Skeleton Loading</p>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-zen-ink/10" />
              <div className="flex-1 h-3 bg-zen-ink/10 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
              <div className="w-16 h-5 rounded-full bg-zen-ink/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {PACKAGES.slice(0, 3).map(p => (
            <div key={p} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-xl bg-zen-brand/10 flex items-center justify-center text-zen-brand">
                <Sparkles size={12} />
              </div>
              <p className="flex-1 text-sm font-medium">{p}</p>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zen-brand/10 text-zen-brand">Aktif</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Smooth card transitions (dummy). */
function TransitionDemo() {
  const [active, setActive] = useState(0);
  const tabs = ['Member', 'Coach', 'Paket'];
  const content = [
    'Halaman member dengan transisi halus antar section — tidak ada jarring layout shift.',
    'Profil coach muncul dengan animasi slide-up, data terisi smooth tanpa flash.',
    'Paket berganti dengan fade transition — user merasa aplikasi "hidup".',
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Transisi Halus</p>
      <div className="flex gap-1">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${active === i ? 'bg-zen-brand text-white' : 'bg-zen-ink/5 text-zen-ink/40 hover:text-zen-ink'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="bg-zen-bg/50 rounded-xl px-4 py-3 text-xs text-zen-ink/60 leading-relaxed transition-all duration-300">
        {content[active]}
      </div>
    </div>
  );
}

/** Loading spinner premium. */
function LoaderDemo() {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Loading States</p>
      <div className="flex items-center gap-4 bg-white border border-zen-ink/5 rounded-xl px-4 py-3">
        <Loader2 size={18} className="text-zen-brand animate-spin" />
        <div>
          <p className="text-xs font-medium text-zen-ink">Memuat data...</p>
          <p className="text-[10px] text-zen-ink/30">Konten akan muncul setelah siap</p>
        </div>
      </div>
    </div>
  );
}

/** Preview UI/UX premium — searchable select, skeleton, transitions, loaders. */
export function UIUXPreview() {
  return (
    <div className="pointer-events-none select-none space-y-4">
      {/* Header mockup */}
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-zen-brand" />
        <p className="text-sm font-bold">UI/UX Premium</p>
      </div>

      <SearchableSelectDemo />
      <SkeletonDemo />
      <TransitionDemo />
      <LoaderDemo />

      {/* Footer note */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
        <Sparkles size={12} className="text-blue-600 shrink-0" />
        <p className="text-[10px] text-blue-700">Setiap interaksi terasa lebih halus — bukan cuma fungsi, tapi pengalaman.</p>
      </div>
    </div>
  );
}
