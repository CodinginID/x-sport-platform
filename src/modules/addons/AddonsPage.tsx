import { useState, useEffect, type ReactNode } from 'react';
import {
  Sparkles, Check, Clock, MessageCircle, X, Eye, RefreshCw,
  ArrowRight, FileSpreadsheet, LayoutList, MousePointerClick, Shield,
  CreditCard, ArrowDownLeft, Smartphone, Copy, ExternalLink,
  TrendingUp, Users, Package, Star,
} from 'lucide-react';
import { FEATURES, FEATURE_KEYS, type FeatureKey } from '@/config/features';
import { featureState } from '@/lib/featureState';
import { useFeatureTrial } from '@/hooks/useFeatureTrial';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { validateLicense } from '@/services/license';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { formatCurrency } from '@/utils';
import { PremiumBookingPreview } from './PremiumBookingPreview';
import { DashboardProPreview } from './DashboardProPreview';
import { ReportsPreview } from './ReportsPreview';
import { UIUXPreview } from './UIUXPreview';

// ─── Invoice generator ──────────────────────────────────────────────────────
let _invoiceCounter = 0;
function generateInvoice(licenseKey: string): string {
  _invoiceCounter += 1;
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = String(_invoiceCounter).padStart(4, '0');
  return `INV-${stamp}-${licenseKey.slice(0, 4).toUpperCase()}-${suffix}`;
}

// ─── Countdown timer (24 hours from now) ────────────────────────────────────
function useCountdown(hours: number = 24) {
  const [remaining, setRemaining] = useState(hours * 3600);
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (remaining <= 0) return { expired: true, label: 'Invoice kadaluarsa', urgent: false };
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const urgent = h < 2;
  return {
    expired: false,
    label: `${h}j ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}d`,
    urgent,
  };
}

// ─── Preview tab definitions ────────────────────────────────────────────────
const PRO_PREVIEW_TABS = [
  {
    key: 'jadwal', label: 'Jadwal',
    caption: 'Cari slot kosong sekejap: kartu per tanggal, heatmap okupansi, filter "hanya yang ada slot".',
    node: <PremiumBookingPreview />,
    beforeDesc: 'List polos, tanpa heatmap. Filter tanggal manual, harus scroll satu-satu untuk tahu slot tersedia.',
  },
  {
    key: 'dashboard', label: 'Dashboard',
    caption: 'Pantau bisnis dalam grafik: tren pendapatan & kehadiran, jam tersibuk, okupansi, paket/coach terlaris.',
    node: <DashboardProPreview />,
    beforeDesc: 'Dashboard angka statis. Tidak ada grafik tren — harus export manual untuk analisis.',
  },
  {
    key: 'laporan', label: 'Laporan',
    caption: 'Export PDF & Excel instan: laporan penjualan, pembayaran, member, komisi — siap cetak atau share.',
    node: <ReportsPreview />,
    beforeDesc: 'Laporan hanya tabel di layar. Tidak bisa export — harus screenshot atau catat manual.',
  },
  {
    key: 'uiux', label: 'UI/UX',
    caption: 'Dropdown searchable, skeleton loading animasi halus, transisi mulus — aplikasi terasa lebih profesional.',
    node: <UIUXPreview />,
    beforeDesc: 'Dropdown native browser, spinner loading kaku, tanpa transisi — terasa seperti aplikasi lama.',
  },
] as const;

/** Preview multi-tab Pro — visual mockups, bukan text description */
function ProPreviewTabs({ activeTabKey, onTabChange }: { activeTabKey: (typeof PRO_PREVIEW_TABS)[number]['key']; onTabChange: (k: (typeof PRO_PREVIEW_TABS)[number]['key']) => void }) {
  const active = PRO_PREVIEW_TABS.find((t) => t.key === activeTabKey) ?? PRO_PREVIEW_TABS[0];
  return (
    <div className="space-y-4">
      {/* Tabs — with icons */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'jadwal', label: 'Jadwal', icon: <Clock size={12} /> },
          { key: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={12} /> },
          { key: 'laporan', label: 'Laporan', icon: <FileSpreadsheet size={12} /> },
          { key: 'uiux', label: 'UI/UX', icon: <MousePointerClick size={12} /> },
        ].map((t) => (
          <button key={t.key} onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTabKey === t.key ? 'bg-zen-brand text-white shadow-sm' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Main visual — the hero */}
      <div className="rounded-3xl overflow-hidden border border-zen-ink/10 bg-white shadow-lg">{active.node}</div>

      {/* Visual comparison — BEFORE vs AFTER with mini mockups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* BEFORE mockup */}
        <div className="rounded-3xl border border-zen-ink/10 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zen-ink/5 border-b border-zen-ink/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zen-ink/15" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30">Tanpa Pro</p>
          </div>
          <div className="p-4">
            {/* Mini mockup: flat list */}
            <div className="space-y-2">
              {[
                { time: '08:00', label: 'Reguler · Coach Budi', status: 'full' },
                { time: '10:00', label: 'Private · Coach Sinta', status: 'full' },
                { time: '16:00', label: 'Reguler · Coach Budi', status: 'full' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-zen-ink/5 last:border-0">
                  <span className="text-[10px] font-mono font-bold text-zen-ink/30 w-10">{item.time}</span>
                  <span className="text-[10px] text-zen-ink/30 flex-1 truncate">{item.label}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100/60 text-red-400">Penuh</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zen-ink/25 mt-3 text-center italic">{active.beforeDesc.split('.')[0]}.</p>
          </div>
        </div>

        {/* AFTER mockup — with gradient border + glow */}
        <div className="rounded-3xl border-2 border-zen-brand/25 bg-gradient-to-b from-zen-brand/5 to-white overflow-hidden relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-zen-brand/5 animate-pulse pointer-events-none rounded-3xl" />

          <div className="relative px-4 py-2.5 bg-zen-brand/10 border-b border-zen-brand/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zen-brand animate-pulse" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-brand">Dengan Pro</p>
          </div>
          <div className="p-4">
            {/* Mini mockup: premium cards */}
            <div className="space-y-2">
              {[
                { time: '08:00', coach: 'Coach Budi', slots: 3, total: 8 },
                { time: '10:00', coach: 'Coach Sinta', slots: 0, total: 1 },
                { time: '16:00', coach: 'Coach Budi', slots: 8, total: 8 },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 py-2 rounded-xl px-2 ${item.slots > 0 ? 'bg-green-50/80 border border-green-100' : 'bg-red-50/50 border border-red-100'}`}>
                  <span className="text-[10px] font-mono font-bold text-zen-ink w-10">{item.time}</span>
                  <span className="text-[10px] text-zen-ink/60 flex-1 truncate">{item.coach}</span>
                  {item.slots > 0 ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">✓ {item.slots} slot</span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-500">Penuh</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zen-brand/60 mt-3 text-center italic">{active.caption.split(':')[0]}.</p>
          </div>
        </div>
      </div>

      {/* Insight bridge */}
      <div className="flex items-center gap-2 justify-center py-1">
        <div className="w-8 h-8 rounded-full bg-zen-brand/10 flex items-center justify-center">
          <ArrowRight size={14} className="text-zen-brand animate-pulse" />
        </div>
        <span className="text-[11px] text-zen-ink/50">Dari tampilan biasa <span className="text-zen-brand font-bold">→</span> insight yang bisa ditindaklanjuti</span>
      </div>
    </div>
  );
}

const FEATURE_PREVIEWS: Partial<Record<FeatureKey, ReactNode>> = { pro: null };

const BENEFIT_ICONS: Record<string, ReactNode> = {
  'Dashboard grafik': <LayoutList size={14} />,
  'Jadwal sesi': <Clock size={14} />,
  'Dropdown': <MousePointerClick size={14} />,
  'Laporan': <FileSpreadsheet size={14} />,
};

function benefitIcon(text: string): ReactNode {
  for (const [key, icon] of Object.entries(BENEFIT_ICONS)) {
    if (text.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <Check size={14} />;
}

function buyWaLink(wa: string, studio: string, licenseKey: string, label: string, invoice: string, price: number) {
  const text = `Halo Admin, saya dari studio "${studio}" (lisensi ${licenseKey}) ingin membeli add-on: ${label}.\n\nNomor invoice: ${invoice}\nNominal: ${formatCurrency(price)}\n\nSaya lampirkan bukti transfer. Terima kasih.`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

export default function AddonsPage() {
  const licenseInfo = useAuthStore((s) => s.licenseInfo);
  const { startTrial, pending } = useFeatureTrial();
  const { data: config } = usePlatformConfig();
  const addToast = useToastStore((s) => s.addToast);
  const [buyKey, setBuyKey] = useState<FeatureKey | null>(null);
  const [previewKey, setPreviewKey] = useState<FeatureKey | null>(null);
  const [previewTab, setPreviewTab] = useState<(typeof PRO_PREVIEW_TABS)[number]['key']>('jadwal');
  const [refreshing, setRefreshing] = useState(false);
  const nowISO = new Date().toISOString();
  const [invoice] = useState(() => generateInvoice(licenseInfo?.license_key ?? 'DEMO'));
  const countdown = useCountdown(24);

  const getActiveTabKey = () => previewTab;
  const getPreviewNode = () => { const a = PRO_PREVIEW_TABS.find((t) => t.key === previewTab) ?? PRO_PREVIEW_TABS[0]; return a.node; };
  const getBeforeDesc = () => { const a = PRO_PREVIEW_TABS.find((t) => t.key === previewTab) ?? PRO_PREVIEW_TABS[0]; return a.beforeDesc; };
  const getCaption = () => { const a = PRO_PREVIEW_TABS.find((t) => t.key === previewTab) ?? PRO_PREVIEW_TABS[0]; return a.caption; };

  const refreshEntitlement = async (notify = false) => {
    const { licenseInfo: li, updateLicenseInfo } = useAuthStore.getState();
    if (!li?.license_key) return;
    setRefreshing(true);
    try {
      const fresh = await validateLicense(li.license_key);
      if (fresh.ok && fresh.data) await updateLicenseInfo(fresh.data);
      if (notify) addToast('Status add-on diperbarui', 'success');
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { refreshEntitlement(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const priceOf = (key: FeatureKey): number | null => config?.feature_prices?.[key] ?? null;
  const fmtPrice = (key: FeatureKey) => { const p = priceOf(key); return p == null ? '—' : formatCurrency(p); };

  // Social proof — mock data (in production, fetch from server)
  const activeStudios = 47;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={22} className="text-zen-brand" />
          <h1 className="text-2xl font-bold">Add-ons Feature</h1>
        </div>
        <button onClick={() => refreshEntitlement(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-zen-ink/10 text-xs font-bold text-zen-ink/60 hover:text-zen-brand hover:border-zen-brand/30 transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Perbarui status
        </button>
      </div>

      {/* Add-on cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURE_KEYS.map((key) => {
          const f = FEATURES[key];
          const { state, trialDaysLeft } = featureState(licenseInfo?.features, key, nowISO);
          const isPro = state === 'active';

          return (
            <div key={key} className={`rounded-3xl border p-0 overflow-hidden transition-all ${isPro ? 'border-zen-brand/30 shadow-lg shadow-zen-brand/5' : 'border-zen-ink/5 bg-white hover:shadow-md'}`}>
              {/* Header */}
              <div className={`px-5 py-4 ${isPro ? 'bg-gradient-to-r from-zen-brand/10 to-zen-brand/5' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className={isPro ? 'text-zen-brand animate-pulse' : 'text-zen-ink/20'} />
                    <p className="text-base font-bold text-zen-ink">{f.label}</p>
                  </div>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zen-brand text-white text-[10px] font-bold uppercase tracking-widest">
                      <Check size={11} className="animate-check-bounce" /> Aktif
                    </span>
                  )}
                </div>
                <p className="text-xs text-zen-ink/50 mt-1 leading-relaxed">{f.description}</p>
              </div>

              {/* Before → After mini */}
              <div className="px-5 py-3 bg-zen-bg/40 border-y border-zen-ink/5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-zen-ink/30 font-medium">List polos</span>
                  <ArrowRight size={12} className="text-zen-brand/50" />
                  <span className="text-zen-brand font-bold">Grafik + insight</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-5 py-3 space-y-1.5 stagger-children">
                {f.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-zen-ink/60">
                    <span className="text-zen-brand shrink-0 mt-0.5">{benefitIcon(d)}</span>
                    <span className="leading-snug">{d}</span>
                  </div>
                ))}
              </div>

              {/* Social proof */}
              <div className="px-5 pb-1">
                <div className="flex items-center gap-1.5 text-[10px] text-zen-ink/35">
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <span>{activeStudios} studio sudah mengaktifkan Pro</span>
                </div>
              </div>

              {/* Preview button */}
              <div className="px-5 pb-3">
                <button onClick={() => { setPreviewKey(key); setPreviewTab('jadwal'); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zen-brand hover:underline">
                  <Eye size={13} /> Lihat Preview Lengkap ({PRO_PREVIEW_TABS.length} tab)
                </button>
              </div>

              {/* Price + CTA */}
              <div className="px-5 pb-5 space-y-3">
                <div>
                  <p className="text-2xl font-bold text-zen-brand">{fmtPrice(key)}</p>
                  <p className="text-[10px] text-zen-ink/30">Aktivasi selamanya, tanpa biaya bulanan</p>
                </div>

                {state === 'active' && (
                  <div className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                    <Shield size={13} /> Semua fitur Pro terbuka
                  </div>
                )}
                {state === 'trial' && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zen-brand">
                      <Clock size={14} /> Trial — sisa {trialDaysLeft} hari
                    </span>
                    <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 active:scale-[0.98] transition-all">Beli Sekarang</button>
                  </div>
                )}
                {state === 'trial_expired' && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600 font-medium">Trial selesai — beli untuk lanjut.</p>
                    <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold hover:bg-zen-brand/90 active:scale-[0.98] transition-all">Beli Sekarang</button>
                  </div>
                )}
                {state === 'locked' && (
                  <button onClick={() => startTrial(key)} disabled={pending === key}
                    className="w-full py-3 rounded-2xl bg-zen-brand/10 text-zen-brand text-sm font-bold disabled:opacity-50 hover:bg-zen-brand/20 transition-colors">
                    {pending === key ? 'Memproses...' : `Coba Gratis ${f.trial_days} Hari`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Sheet — slide-up */}
      {previewKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-zen-bg/60 backdrop-blur-sm" onClick={() => setPreviewKey(null)} />
          <div className="relative w-full sm:max-w-3xl sm:mx-4 bg-white sm:rounded-[28px] rounded-t-[28px] max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up sm:animate-page-in">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
            <div className="shrink-0 bg-gradient-to-r from-zen-brand to-green-400 px-5 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewKey(null)} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-white/60">Preview</p>
                  <p className="text-base font-bold text-white">{FEATURES[previewKey].label}</p>
                </div>
              </div>
              <button onClick={() => setPreviewKey(null)} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><X size={16} className="text-white" /></button>
            </div>
            <div className="shrink-0 bg-gradient-to-b from-green-50/60 to-white px-5 py-4">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {PRO_PREVIEW_TABS.map((t) => (
                  <button key={t.key} onClick={() => setPreviewTab(t.key)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      getActiveTabKey() === t.key
                        ? 'bg-zen-brand text-white shadow-sm'
                        : 'bg-white border border-zen-ink/10 text-zen-ink/40 hover:text-zen-ink'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="px-5 pb-32 space-y-5">
                <div className="rounded-3xl overflow-hidden shadow-lg border border-zen-ink/5">{getPreviewNode()}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-zen-ink/10 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zen-ink/15" />
                      <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Tanpa Pro</p>
                    </div>
                    <p className="text-xs text-zen-ink/60 leading-relaxed">{getBeforeDesc()}</p>
                  </div>
                  <div className="rounded-3xl border border-zen-brand/20 bg-gradient-to-b from-zen-brand/5 to-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zen-brand animate-pulse" />
                      <p className="text-[9px] uppercase tracking-widest font-bold text-zen-brand">Dengan Pro</p>
                    </div>
                    <p className="text-xs text-zen-ink/70 leading-relaxed">{getCaption()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zen-ink/35 justify-center">
                  <ArrowRight size={14} className="text-zen-brand/40" />
                  <span className="italic">"{getBeforeDesc().split(',')[0]}" → insight yang bisa ditindaklanjuti</span>
                </div>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-2xl px-3.5 py-2.5">
                  <Eye size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700/80 leading-snug">Data di atas adalah contoh. Setelah Pro aktif, grafik akan diisi dari data studio Anda.</p>
                </div>
              </div>
            </div>
            <div className="shrink-0 bg-white border-t border-zen-ink/10 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-zen-ink">Mau seperti ini?</p>
                <p className="text-[10px] text-zen-ink/40">{fmtPrice('pro')} · selamanya</p>
              </div>
              <button onClick={() => { setPreviewKey(null); setBuyKey('pro'); }}
                className="px-6 py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold shadow-sm hover:bg-zen-brand/90 active:scale-[0.98] transition-all">
                Beli Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal — 10/10 premium experience */}
      {buyKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-zen-ink/50 backdrop-blur-sm" onClick={() => setBuyKey(null)} />
          <div className="relative w-full sm:max-w-md sm:mx-4 bg-white sm:rounded-[32px] rounded-t-[28px] max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up sm:animate-scale-in shadow-2xl shadow-zen-ink/20">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

            {/* Header gradient */}
            <div className="shrink-0 bg-gradient-to-r from-zen-brand to-green-400 px-6 py-6 text-center relative">
              <button onClick={() => setBuyKey(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><X size={16} className="text-white" /></button>

              {/* Progress stepper */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><Eye size={12} className="text-white/60" /></div>
                  <span className="text-[9px] font-bold text-white/40">Preview</span>
                </div>
                <ArrowRight size={10} className="text-white/30" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><CreditCard size={12} className="text-zen-brand" /></div>
                  <span className="text-[9px] font-bold text-white">Bayar</span>
                </div>
                <ArrowRight size={10} className="text-white/30" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle size={12} className="text-white/60" /></div>
                  <span className="text-[9px] font-bold text-white/40">Konfirmasi</span>
                </div>
              </div>

              <p className="text-[9px] uppercase tracking-widest font-bold text-white/60 mb-1">Pembayaran</p>
              <p className="text-xl font-bold text-white">{FEATURES[buyKey].label}</p>
              <p className="text-3xl font-bold text-white mt-1">{fmtPrice(buyKey)}</p>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Invoice card — shimmer effect */}
              <div className="rounded-3xl border border-zen-brand/10 bg-gradient-to-br from-zen-bg via-white to-zen-brand/5 p-5 relative overflow-hidden">
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zen-brand/5 to-transparent animate-shimmer pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Nomor Invoice</p>
                    {/* Countdown urgency */}
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${countdown.urgent ? 'text-red-500 animate-countdown-pulse' : 'text-zen-ink/30'}`}>
                      <Clock size={11} />
                      <span>{countdown.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-mono font-bold text-zen-ink tracking-wider">{invoice}</p>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(invoice); addToast('Invoice disalin', 'success'); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zen-brand/10 text-zen-brand text-[10px] font-bold hover:bg-zen-brand/20 transition-colors"
                    >
                      <Copy size={11} /> Salin
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment steps — with icons */}
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-3">Cara Pembayaran</p>
                <div className="space-y-3 stagger-children">
                  {[
                    { icon: <ArrowDownLeft size={16} />, text: `Transfer tepat ${fmtPrice(buyKey)} ke rekening di bawah`, color: 'bg-blue-500' },
                    { icon: <Smartphone size={16} />, text: 'Screenshot bukti transfer dari aplikasi bank', color: 'bg-amber-500' },
                    { icon: <MessageCircle size={16} />, text: 'Klik tombol WhatsApp & kirim bukti transfer', color: 'bg-green-500' },
                    { icon: <Check size={16} />, text: 'Fitur aktif dalam 1×24 jam setelah verifikasi', color: 'bg-zen-brand' },
                  ].map(({ icon, text, color }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                        {icon}
                      </div>
                      <p className="text-sm text-zen-ink/70 leading-snug pt-1.5">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank details — prominent card */}
              {config?.bank_name ? (
                <div className="rounded-3xl border-2 border-zen-brand/15 bg-gradient-to-br from-zen-brand/5 to-green-50 p-5 relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-zen-brand flex items-center justify-center shadow-md shadow-zen-brand/30">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
                    </div>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-zen-brand">Rekening Tujuan</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-zen-ink">{config.bank_name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-mono font-bold text-zen-ink tracking-wider">{config.bank_account_number}</p>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(config.bank_account_number); addToast('No. rekening disalin', 'success'); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zen-brand/10 text-zen-brand text-[10px] font-bold hover:bg-zen-brand/20 transition-colors"
                      >
                        <Copy size={11} /> Salin
                      </button>
                    </div>
                    <p className="text-xs text-zen-ink/50">a.n. {config.bank_account_holder}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zen-ink/40 text-center py-4">Hubungi admin untuk info rekening pembayaran.</p>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-2xl px-3.5 py-2.5">
                <Eye size={12} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700/80 leading-snug">Sertakan nomor invoice saat konfirmasi agar kami bisa mencocokkan pembayaran Anda.</p>
              </div>
            </div>

            {/* Sticky bottom CTA */}
            {config?.admin_wa ? (
              <div className="shrink-0 bg-white border-t border-zen-ink/10 px-6 py-5">
                <a
                  href={buyWaLink(config.admin_wa, licenseInfo?.studio_name ?? '-', licenseInfo?.license_key ?? '-', FEATURES[buyKey].label, invoice, priceOf(buyKey) ?? 0)}
                  target="_blank" rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
                >
                  <MessageCircle size={18} /> Konfirmasi via WhatsApp
                </a>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <ExternalLink size={10} className="text-zen-ink/20" />
                  <p className="text-[9px] text-zen-ink/30">Anda akan diarahkan ke WhatsApp → kirim bukti transfer</p>
                </div>
              </div>
            ) : (
              <div className="shrink-0 px-6 py-5">
                <button disabled className="w-full py-4 rounded-2xl bg-zen-ink/10 text-zen-ink/40 text-sm font-bold">
                  Nomor admin belum diatur
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
