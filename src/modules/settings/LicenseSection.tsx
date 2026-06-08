import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredLicense, isLicenseExpired, validateLicense, clearStoredLicense } from '@/services/license';
import type { LicenseInfo } from '@/services/license';
import { KeyRound, CheckCircle2, AlertTriangle, Clock, Copy, Check, RefreshCw, ExternalLink, ShieldCheck, RotateCcw } from 'lucide-react';
import { useConfirmStore } from '@/components/ConfirmDialog';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type LicenseStatus = 'demo' | 'active' | 'expired' | 'locked';

function getStatus(license: ReturnType<typeof getStoredLicense>): LicenseStatus {
  if (!license || !license.activated_at) return 'demo';
  if (isLicenseExpired()) return 'expired';
  return 'active';
}

const STATUS_CONFIG: Record<LicenseStatus, { label: string; badge: string; icon: React.ReactNode; desc: string }> = {
  demo: {
    label: 'Mode Demo',
    badge: 'bg-amber-100 text-amber-700',
    icon: <Clock size={14} className="text-amber-600" />,
    desc: 'Lisensi belum diaktifkan. Data yang tampil hanya contoh.',
  },
  active: {
    label: 'Aktif',
    badge: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 size={14} className="text-green-600" />,
    desc: 'Lisensi aktif dan terverifikasi.',
  },
  expired: {
    label: 'Expired',
    badge: 'bg-red-100 text-red-600',
    icon: <AlertTriangle size={14} className="text-red-500" />,
    desc: 'Masa berlaku lisensi sudah habis. Hubungi developer untuk perpanjang.',
  },
  locked: {
    label: 'Terkunci',
    badge: 'bg-red-100 text-red-600',
    icon: <AlertTriangle size={14} className="text-red-500" />,
    desc: 'Lisensi tidak valid. Perlu validasi ulang.',
  },
};

export function LicenseSection() {
  const navigate = useNavigate();
  const confirm = useConfirmStore(s => s.show);
  const [license, setLicense] = useState<(LicenseInfo & { validatedAt: string }) | null>(null);
  const [status, setStatus] = useState<LicenseStatus>('demo');
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateMsg, setValidateMsg] = useState('');

  useEffect(() => {
    const stored = getStoredLicense();
    setLicense(stored);
    setStatus(getStatus(stored));
  }, []);

  const handleReset = () => {
    confirm({
      title: 'Reset ke Mode Demo?',
      message: 'Data lisensi lokal akan dihapus dan aplikasi kembali ke mode demo. Anda perlu aktivasi ulang untuk menggunakan fitur penuh.',
      variant: 'warning',
      onConfirm: () => { clearStoredLicense(); window.location.reload(); },
    });
  };

  const copyKey = () => {
    if (!license?.license_key) return;
    navigator.clipboard.writeText(license.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidateMsg('');
    const result = await validateLicense();
    setValidating(false);
    if (result.ok) {
      const stored = getStoredLicense();
      setLicense(stored);
      setStatus(getStatus(stored));
      setValidateMsg('Lisensi berhasil divalidasi.');
    } else {
      setValidateMsg(result.error);
    }
  };

  const cfg = STATUS_CONFIG[status];
  const days = daysUntil(license?.expires_at);
  const isExpiringSoon = days !== null && days > 0 && days <= 30;

  return (
    <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zen-ink/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-zen-brand/10 flex items-center justify-center text-zen-brand shrink-0">
          <ShieldCheck size={17} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Status Lisensi</p>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Description */}
        <p className="text-xs text-zen-ink/50">{cfg.desc}</p>

        {license?.license_key && (
          <>
            {/* License key */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">License Key</p>
              <button
                onClick={copyKey}
                className="w-full flex items-center justify-between gap-3 bg-zen-bg rounded-2xl px-4 py-3 hover:bg-zen-brand/5 transition-colors group"
              >
                <span className="font-mono font-bold text-zen-brand tracking-widest text-sm truncate">
                  {license.license_key}
                </span>
                {copied
                  ? <Check size={14} className="text-green-500 shrink-0" />
                  : <Copy size={14} className="text-zen-ink/30 group-hover:text-zen-ink/60 shrink-0" />
                }
              </button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {license.studio_name && (
                <InfoItem label="Studio" value={license.studio_name} />
              )}
              {license.plan && (
                <InfoItem label="Plan" value={license.plan.toUpperCase()} />
              )}
              {license.expires_at && (
                <InfoItem
                  label="Berlaku sampai"
                  value={formatDate(license.expires_at)}
                  highlight={isExpiringSoon ? 'amber' : status === 'expired' ? 'red' : undefined}
                />
              )}
              {license.activated_at && (
                <InfoItem label="Diaktifkan" value={formatDate(license.activated_at)} />
              )}
              {license.validatedAt && (
                <InfoItem label="Tervalidasi" value={formatDate(license.validatedAt)} />
              )}
            </div>

            {/* Expiry warning */}
            {isExpiringSoon && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800">
                  Lisensi berakhir dalam {days} hari. Segera perpanjang.
                </p>
              </div>
            )}

            {/* Validate result */}
            {validateMsg && (
              <div className={`rounded-2xl px-4 py-3 text-xs font-bold ${validateMsg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {validateMsg}
              </div>
            )}

            {/* Validate button (only when activated & online) */}
            {status === 'active' && (
              <button
                onClick={handleValidate}
                disabled={validating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-zen-bg text-zen-ink/60 hover:bg-zen-brand/5 hover:text-zen-brand text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={validating ? 'animate-spin' : ''} />
                {validating ? 'Memvalidasi...' : 'Validasi Ulang'}
              </button>
            )}
          </>
        )}

        {/* CTA */}
        {(status === 'demo' || status === 'expired' || status === 'locked') && (
          <button
            onClick={() => navigate('/activation')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zen-brand text-white text-[11px] uppercase tracking-widest font-bold shadow-lg shadow-zen-brand/20 hover:opacity-90 transition-opacity"
          >
            <KeyRound size={13} />
            {status === 'demo' ? 'Aktivasi Lisensi' : 'Aktivasi Ulang'}
            <ExternalLink size={11} className="opacity-60" />
          </button>
        )}

        {/* Reset to demo — only if there's stored license data */}
        {license && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zen-ink/25 hover:text-red-400 transition-colors py-1"
          >
            <RotateCcw size={10} />
            Reset ke mode demo
          </button>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: 'amber' | 'red' }) {
  const color = highlight === 'amber' ? 'text-amber-600' : highlight === 'red' ? 'text-red-500' : 'text-zen-ink';
  return (
    <div className="bg-zen-bg rounded-2xl px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${color}`}>{value}</p>
    </div>
  );
}
