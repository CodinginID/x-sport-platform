import { useState, useEffect, type ReactNode } from 'react';
import { Sparkles, Check, Clock, MessageCircle, X, Eye, RefreshCw } from 'lucide-react';
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

// Tiap tab preview disertai caption "apa yang dijual" agar calon pembeli paham nilainya.
const PRO_PREVIEW_TABS = [
  {
    key: 'jadwal', label: 'Jadwal',
    caption: 'Cari slot kosong sekejap: kartu per tanggal, heatmap okupansi, filter "hanya yang ada slot".',
    node: <PremiumBookingPreview />,
  },
  {
    key: 'dashboard', label: 'Dashboard',
    caption: 'Pantau bisnis dalam grafik: tren pendapatan & kehadiran, jam tersibuk, okupansi, paket/coach terlaris.',
    node: <DashboardProPreview />,
  },
] as const;

/** Preview multi-tab Pro: Jadwal premium + Dashboard premium, dengan anotasi tiap tab. */
function ProPreviewTabs() {
  const [tab, setTab] = useState<(typeof PRO_PREVIEW_TABS)[number]['key']>('jadwal');
  const active = PRO_PREVIEW_TABS.find((t) => t.key === tab) ?? PRO_PREVIEW_TABS[0];
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {PRO_PREVIEW_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all ${tab === t.key ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Anotasi: jelaskan manfaat tab ini */}
      <div className="flex items-start gap-2 bg-zen-brand/5 rounded-2xl px-4 py-3">
        <Sparkles size={14} className="text-zen-brand shrink-0 mt-0.5" />
        <p className="text-xs text-zen-ink/70 leading-relaxed">{active.caption}</p>
      </div>
      <div className="rounded-2xl overflow-hidden">{active.node}</div>
    </div>
  );
}

// Preview visualisasi per fitur (tampil di tombol "Lihat Preview").
const FEATURE_PREVIEWS: Partial<Record<FeatureKey, ReactNode>> = {
  pro: <ProPreviewTabs />,
};

function buyWaLink(wa: string, studio: string, licenseKey: string, label: string) {
  const text = `Halo Admin, saya dari studio "${studio}" (lisensi ${licenseKey}) ingin membeli add-on: ${label}.`;
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

  // Sinkronkan entitlement: superadmin bisa mengaktifkan fitur dari sisinya, jadi
  // re-validate lisensi saat halaman dibuka (+ tombol Perbarui) agar owner langsung lihat.
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
  useEffect(() => { refreshEntitlement(false); /* on mount */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURE_KEYS.map((key) => {
          const f = FEATURES[key];
          const { state, trialDaysLeft } = featureState(licenseInfo?.features, key, nowISO);
          return (
            <div key={key} className="bg-white rounded-3xl border border-zen-ink/5 p-5 space-y-3">
              <div>
                <p className="text-base font-bold text-zen-ink">{f.label}</p>
                <p className="text-xs text-zen-ink/50 mt-0.5 leading-relaxed">{f.description}</p>
              </div>

              {/* Apa yang didapat */}
              <ul className="space-y-1.5">
                {f.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zen-ink/60">
                    <Check size={13} className="text-zen-brand shrink-0 mt-0.5" />
                    <span className="leading-snug">{d}</span>
                  </li>
                ))}
              </ul>

              {FEATURE_PREVIEWS[key] && (
                <button onClick={() => setPreviewKey(key)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zen-brand hover:underline">
                  <Eye size={13} /> Lihat Preview
                </button>
              )}

              <p className="text-lg font-bold text-zen-brand">{fmtPrice(key)}</p>

              {state === 'active' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
                  <Check size={14} /> Aktif
                </span>
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
            <div className="p-4">
              <p className="text-[11px] text-zen-ink/40 mb-3">Contoh tampilan dengan data dummy — beginilah aplikasi Anda akan terlihat dengan fitur ini.</p>
              {FEATURE_PREVIEWS[previewKey]}
            </div>
          </div>
        </div>
      )}

      {/* Modal Beli */}
      {buyKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={() => setBuyKey(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Beli {FEATURES[buyKey].label}</p>
              <button onClick={() => setBuyKey(null)}><X size={18} className="text-zen-ink/40" /></button>
            </div>
            <p className="text-2xl font-bold text-zen-brand">{fmtPrice(buyKey)}</p>

            {/* Info rekening */}
            {config?.bank_name ? (
              <div className="bg-zen-bg rounded-2xl px-4 py-3 text-sm">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Transfer ke</p>
                <p className="font-bold text-zen-ink">{config.bank_name} · {config.bank_account_number}</p>
                <p className="text-zen-ink/50 text-xs">a.n. {config.bank_account_holder}</p>
              </div>
            ) : (
              <p className="text-xs text-zen-ink/50">Hubungi admin untuk info pembayaran.</p>
            )}
            <p className="text-xs text-zen-ink/50 leading-relaxed">
              Transfer sesuai nominal, lalu konfirmasi bukti bayar via WhatsApp. Fitur diaktifkan setelah pembayaran diverifikasi.
            </p>

            {config?.admin_wa ? (
              <a
                href={buyWaLink(config.admin_wa, licenseInfo?.studio_name ?? '-', licenseInfo?.license_key ?? '-', FEATURES[buyKey].label)}
                target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold"
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
