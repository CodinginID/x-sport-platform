import { useState } from 'react';
import { Sparkles, Check, Clock, MessageCircle, X } from 'lucide-react';
import { FEATURES, FEATURE_KEYS, ADMIN_WA, type FeatureKey } from '@/config/features';
import { featureState } from '@/lib/featureState';
import { useFeatureTrial } from '@/hooks/useFeatureTrial';
import { useAuthStore } from '@/stores/auth';
import { formatCurrency } from '@/utils';

function buyWaLink(studio: string, licenseKey: string, label: string) {
  const text = `Halo Admin, saya dari studio "${studio}" (lisensi ${licenseKey}) ingin membeli add-on: ${label}.`;
  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`;
}

export default function AddonsPage() {
  const licenseInfo = useAuthStore((s) => s.licenseInfo);
  const { startTrial, pending } = useFeatureTrial();
  const [buyKey, setBuyKey] = useState<FeatureKey | null>(null);
  const nowISO = new Date().toISOString();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles size={22} className="text-zen-brand" />
        <h1 className="text-2xl font-bold">Add-on Premium</h1>
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
              <p className="text-lg font-bold text-zen-brand">{formatCurrency(f.price)}</p>

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

      {/* Modal Beli */}
      {buyKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={() => setBuyKey(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Beli {FEATURES[buyKey].label}</p>
              <button onClick={() => setBuyKey(null)}><X size={18} className="text-zen-ink/40" /></button>
            </div>
            <p className="text-2xl font-bold text-zen-brand">{formatCurrency(FEATURES[buyKey].price)}</p>
            <p className="text-xs text-zen-ink/50 leading-relaxed">
              Transfer ke rekening admin, lalu konfirmasi bukti bayar via WhatsApp. Fitur diaktifkan setelah pembayaran diverifikasi.
            </p>
            <a
              href={buyWaLink(licenseInfo?.studio_name ?? '-', licenseInfo?.license_key ?? '-', FEATURES[buyKey].label)}
              target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold"
            >
              <MessageCircle size={16} /> Konfirmasi via WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
