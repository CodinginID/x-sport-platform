import { useState, useEffect, type ReactNode } from 'react';
import {
  Sparkles, Check, Clock, MessageCircle, X, Eye, RefreshCw,
  ArrowRight, FileSpreadsheet, LayoutList, MousePointerClick, Shield,
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

// ─── Invoice generator (client-side, unique per-session + counter) ──
let _invoiceCounter = 0;
function generateInvoice(licenseKey: string): string {
  _invoiceCounter += 1;
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = String(_invoiceCounter).padStart(4, '0');
  return `INV-${stamp}-${licenseKey.slice(0, 4).toUpperCase()}-${suffix}`;
}

// ─── Preview tabs with caption ─────────────────────────────────────────────
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

/** Preview multi-tab Pro dengan Before → After per tab. */
function ProPreviewTabs() {
  const [tab, setTab] = useState<(typeof PRO_PREVIEW_TABS)[number]['key']>('jadwal');
  const active = PRO_PREVIEW_TABS.find((t) => t.key === tab) ?? PRO_PREVIEW_TABS[0];
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {PRO_PREVIEW_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all ${tab === t.key ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Before → After */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-zen-ink/10 p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-2">Sebelum (Gratis)</p>
          <p className="text-xs text-zen-ink/50 leading-relaxed">{active.beforeDesc}</p>
        </div>
        <div className="bg-zen-brand/5 rounded-2xl border border-zen-brand/20 p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-brand mb-2">Sesudah (Pro)</p>
          <p className="text-xs text-zen-ink/70 leading-relaxed">{active.caption}</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-1">
        <ArrowRight size={16} className="text-zen-brand/40" />
      </div>
      <div className="rounded-2xl overflow-hidden border border-zen-ink/10">{active.node}</div>
    </div>
  );
}

// Preview visualisasi per fitur (tampil di tombol "Lihat Preview").
const FEATURE_PREVIEWS: Partial<Record<FeatureKey, ReactNode>> = {
  pro: <ProPreviewTabs />,
};

// Icon map per benefit detail
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
  const [refreshing, setRefreshing] = useState(false);
  const nowISO = new Date().toISOString();
  const [invoice] = useState(() => generateInvoice(licenseInfo?.license_key ?? 'DEMO'));

  // Sinkronkan entitlement
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

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURE_KEYS.map((key) => {
          const f = FEATURES[key];
          const { state, trialDaysLeft } = featureState(licenseInfo?.features, key, nowISO);
          const price = priceOf(key);
          const isPro = state === 'active';

          return (
            <div key={key} className={`rounded-3xl border p-0 overflow-hidden transition-shadow ${isPro ? 'border-zen-brand/30 shadow-lg shadow-zen-brand/5' : 'border-zen-ink/5 bg-white'}`}>
              {/* Header */}
              <div className={`px-5 py-4 ${isPro ? 'bg-gradient-to-r from-zen-brand/10 to-zen-brand/5' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className={isPro ? 'text-zen-brand' : 'text-zen-ink/20'} />
                    <p className="text-base font-bold text-zen-ink">{f.label}</p>
                  </div>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zen-brand text-white text-[10px] font-bold uppercase tracking-widest">
                      <Check size={11} /> Aktif
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
              <div className="px-5 py-3 space-y-1.5">
                {f.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-zen-ink/60">
                    <span className="text-zen-brand shrink-0 mt-0.5">{benefitIcon(d)}</span>
                    <span className="leading-snug">{d}</span>
                  </div>
                ))}
              </div>

              {/* Preview button */}
              {FEATURE_PREVIEWS[key] && (
                <div className="px-5 pb-3">
                  <button onClick={() => setPreviewKey(key)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zen-brand hover:underline">
                    <Eye size={13} /> Lihat Preview Lengkap ({PRO_PREVIEW_TABS.length} tab)
                  </button>
                </div>
              )}

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
                    <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold">Beli Sekarang</button>
                  </div>
                )}
                {state === 'trial_expired' && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600 font-medium">Trial selesai — beli untuk lanjut.</p>
                    <button onClick={() => setBuyKey(key)} className="w-full py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold">Beli Sekarang</button>
                  </div>
                )}
                {state === 'locked' && (
                  <button onClick={() => startTrial(key)} disabled={pending === key}
                    className="w-full py-3 rounded-2xl bg-zen-brand/10 text-zen-brand text-sm font-bold disabled:opacity-50">
                    {pending === key ? 'Memproses...' : `Coba Gratis ${f.trial_days} Hari`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Preview */}
      {previewKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={() => setPreviewKey(null)}>
          <div className="bg-zen-bg w-full sm:max-w-2xl sm:mx-4 sm:rounded-[28px] rounded-t-[28px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/90 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-zen-ink/5">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-brand">Preview</p>
                <p className="text-base font-bold">{FEATURES[previewKey].label}</p>
              </div>
              <button onClick={() => setPreviewKey(null)}><X size={18} className="text-zen-ink/40" /></button>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <Eye size={13} className="text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700 font-medium">Ini contoh tampilan dengan data dummy — bukan data studio Anda.</p>
              </div>
              {FEATURE_PREVIEWS[previewKey]}
            </div>
          </div>
        </div>
      )}

      {/* Modal Beli */}
      {buyKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={() => setBuyKey(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Beli {FEATURES[buyKey].label}</p>
              <button onClick={() => setBuyKey(null)}><X size={18} className="text-zen-ink/40" /></button>
            </div>

            {/* Invoice */}
            <div className="bg-zen-bg rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Nomor Invoice</p>
                <p className="text-sm font-mono font-bold text-zen-ink">{invoice}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(invoice); addToast('Invoice disalin', 'success'); }}
                className="text-[10px] font-bold text-zen-brand hover:underline"
              >
                Salin
              </button>
            </div>

            {/* Price */}
            <p className="text-2xl font-bold text-zen-brand">{fmtPrice(buyKey)}</p>

            {/* Langkah pembelian */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Langkah pembelian</p>
              <ol className="space-y-1.5 text-xs text-zen-ink/70">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-zen-brand/10 text-zen-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Transfer <strong>{fmtPrice(buyKey)}</strong> ke rekening di bawah</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-zen-brand/10 text-zen-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Klik tombol "Konfirmasi via WhatsApp" & kirim bukti transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-zen-brand/10 text-zen-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Fitur aktif dalam <strong>1×24 jam</strong> setelah pembayaran diverifikasi</span>
                </li>
              </ol>
            </div>

            {/* Info rekening */}
            {config?.bank_name ? (
              <div className="bg-zen-bg rounded-2xl px-4 py-3 text-sm">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Transfer ke</p>
                <p className="font-bold text-zen-ink">{config.bank_name} · {config.bank_account_number}</p>
                <p className="text-zen-ink/50 text-xs">a.n. {config.bank_account_holder}</p>
              </div>
            ) : (
              <p className="text-xs text-zen-ink/50">Hubungi admin untuk info rekening pembayaran.</p>
            )}

            {config?.admin_wa ? (
              <a
                href={buyWaLink(config.admin_wa, licenseInfo?.studio_name ?? '-', licenseInfo?.license_key ?? '-', FEATURES[buyKey].label, invoice, priceOf(buyKey) ?? 0)}
                target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={16} /> Konfirmasi via WhatsApp
              </a>
            ) : (
              <button disabled className="w-full py-3.5 rounded-2xl bg-zen-ink/10 text-zen-ink/40 text-sm font-bold">
                Nomor admin belum diatur
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
