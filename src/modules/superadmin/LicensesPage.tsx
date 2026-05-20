import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import {
  RefreshCw, Check, Copy, X, Loader2, CheckCircle2,
  XCircle, Clock, AlertTriangle, Mail, Phone, Package, Calendar,
  KeyRound, Building2,
} from 'lucide-react';

interface License {
  id: string;
  license_key: string;
  studio_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan: string | null;
  created_at: string;
  is_active: boolean;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

// ─── License Key Modal ────────────────────────────────────────────────────────

function LicenseKeyModal({ licenseKey, studioName, onClose }: {
  licenseKey: string; studioName: string | null; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[32px] rounded-t-[32px] p-8 space-y-6 animate-slide-up sm:animate-page-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar mobile */}
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-2 mb-2" />

        <div className="text-center">
          <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Lisensi Disetujui</p>
          <h2 className="text-lg font-bold">{studioName || 'Studio'}</h2>
        </div>

        <button
          onClick={copy}
          className="w-full bg-zen-bg rounded-2xl p-5 relative group active:scale-[0.98] transition-transform cursor-pointer text-left"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">License Key</p>
          <p className="text-lg font-mono font-bold tracking-[0.1em] text-zen-brand break-all pr-8">{licenseKey}</p>
          <div className="absolute top-4 right-4 text-zen-ink/30">
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </div>
        </button>

        <p className="text-xs text-center text-zen-ink/40">Tap box di atas untuk menyalin, lalu kirim ke studio owner.</p>

        <button
          onClick={onClose}
          className="w-full py-4 bg-zen-brand text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-transform min-h-[52px]"
        >
          Selesai
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Bottom Sheet Confirm ─────────────────────────────────────────────────────

function ConfirmSheet({ title, message, variant, onConfirm, onCancel }: {
  title: string; message: string; variant: 'danger' | 'warning'; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={onCancel}>
      <div
        className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[24px] rounded-t-[24px] p-6 space-y-4 animate-slide-up sm:animate-page-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden" />
        <h2 className="text-base font-bold pt-1">{title}</h2>
        <p className="text-sm text-zen-ink/60 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onConfirm}
            className={`w-full py-4 text-sm font-bold rounded-2xl text-white min-h-[52px] active:scale-[0.98] transition-transform ${
              variant === 'danger' ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            {variant === 'danger' ? 'Ya, Hapus' : 'Ya, Setujui'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 text-sm font-bold rounded-2xl border border-zen-ink/10 text-zen-ink/60 min-h-[52px] active:scale-[0.98] transition-transform"
          >
            Batal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl p-5 space-y-4 border border-zen-ink/5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-zen-ink/8 rounded-xl animate-pulse" />
          <div className="h-3 w-20 bg-zen-ink/5 rounded-xl animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-zen-ink/5 rounded-full animate-pulse" />
      </div>
      <div className="space-y-3 pt-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 bg-zen-ink/5 rounded animate-pulse" />
            <div className="h-3 bg-zen-ink/5 rounded-xl animate-pulse" style={{ width: `${40 + i * 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── License Card ─────────────────────────────────────────────────────────────

function LicenseCard({ license, onApprove, onReject, isProcessing }: {
  license: License;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const [keyCopied, setKeyCopied] = useState(false);
  const isPending = !license.is_active;

  const copyKey = () => {
    navigator.clipboard.writeText(license.license_key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  return (
    <div className={`rounded-3xl overflow-hidden border transition-all ${
      isPending
        ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-zen-ink/5'
    }`}>
      {/* Card header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isPending ? 'bg-amber-100' : 'bg-green-50'
            }`}>
              <Building2 size={18} className={isPending ? 'text-amber-600' : 'text-green-500'} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{license.studio_name || 'Studio Tanpa Nama'}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mt-0.5">
                {formatDate(license.created_at)}
              </p>
            </div>
          </div>

          {isPending ? (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-full shrink-0">
              <Clock size={9} /> Menunggu
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-full shrink-0">
              <CheckCircle2 size={9} /> Aktif
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-2.5">
          {license.owner_email && (
            <div className="flex items-center gap-2.5">
              <Mail size={13} className="text-zen-ink/30 shrink-0" />
              <p className="text-sm text-zen-ink/70 truncate">{license.owner_email}</p>
            </div>
          )}
          {license.owner_phone && (
            <div className="flex items-center gap-2.5">
              <Phone size={13} className="text-zen-ink/30 shrink-0" />
              <p className="text-sm text-zen-ink/70 font-mono">{license.owner_phone}</p>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Package size={13} className="text-zen-ink/30 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-zen-brand bg-zen-brand/10 px-2 py-0.5 rounded-full">
              {license.plan || 'basic'}
            </span>
          </div>
        </div>
      </div>

      {/* License key (active only) */}
      {!isPending && (
        <button
          onClick={copyKey}
          className="w-full px-5 py-3.5 border-t border-zen-ink/5 flex items-center justify-between gap-3 active:bg-zen-bg transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <KeyRound size={13} className="text-zen-brand shrink-0" />
            <p className="text-xs font-mono font-bold text-zen-brand truncate">{license.license_key}</p>
          </div>
          {keyCopied
            ? <Check size={14} className="text-green-500 shrink-0" />
            : <Copy size={14} className="text-zen-ink/30 shrink-0" />
          }
        </button>
      )}

      {/* Action buttons (pending only) */}
      {isPending && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="py-3.5 border border-red-200 text-red-500 text-xs font-bold rounded-2xl active:scale-[0.97] transition-transform disabled:opacity-40 min-h-[48px] flex items-center justify-center gap-1.5"
          >
            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Tolak
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="py-3.5 bg-green-500 text-white text-xs font-bold rounded-2xl active:scale-[0.97] transition-transform disabled:opacity-40 min-h-[48px] flex items-center justify-center gap-1.5"
          >
            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedLicense, setApprovedLicense] = useState<License | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: string; variant: 'danger' | 'warning'; onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'warning', onConfirm: () => {} });

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('licenses')
      .select('id, license_key, studio_name, owner_email, owner_phone, plan, created_at, is_active')
      .order('is_active', { ascending: true })   // pending first
      .order('created_at', { ascending: false });

    if (fetchErr) setError('Gagal memuat: ' + fetchErr.message);
    else setLicenses((data as License[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);

  const handleApprove = (license: License) => {
    setConfirm({
      open: true,
      title: 'Setujui Lisensi?',
      message: `Aktifkan lisensi untuk "${license.studio_name || license.owner_email}"?`,
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(license.id);
        const { error: updateErr } = await supabase
          .from('licenses')
          .update({ is_active: true })
          .eq('id', license.id);

        if (updateErr) { setError('Gagal approve: ' + updateErr.message); setActionLoading(null); return; }
        await fetchLicenses();
        setActionLoading(null);
        setApprovedLicense({ ...license, is_active: true });
      },
    });
  };

  const handleReject = (license: License) => {
    setConfirm({
      open: true,
      title: 'Tolak & Hapus?',
      message: `Hapus pendaftaran dari "${license.studio_name || license.owner_email}"? Tidak bisa dibatalkan.`,
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(license.id);
        const { error: delErr } = await supabase.from('licenses').delete().eq('id', license.id);
        if (delErr) { setError('Gagal hapus: ' + delErr.message); setActionLoading(null); return; }
        await fetchLicenses();
        setActionLoading(null);
      },
    });
  };

  const pendingCount = licenses.filter(l => !l.is_active).length;
  const activeCount = licenses.filter(l => l.is_active).length;

  const filtered = licenses.filter(l => {
    if (filter === 'pending') return !l.is_active;
    if (filter === 'active') return l.is_active;
    return true;
  });

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lisensi</h1>
        <button
          onClick={fetchLicenses}
          disabled={loading}
          className="w-10 h-10 rounded-2xl border border-zen-ink/10 flex items-center justify-center text-zen-ink/50 active:bg-zen-bg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-zen-ink/5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5">Total</p>
          <p className="text-2xl font-bold">{loading ? '—' : licenses.length}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-[9px] uppercase tracking-widest font-bold text-amber-500/80 mb-1.5">Menunggu</p>
          <p className="text-2xl font-bold text-amber-500">{loading ? '—' : pendingCount}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-[9px] uppercase tracking-widest font-bold text-green-500/80 mb-1.5">Aktif</p>
          <p className="text-2xl font-bold text-green-500">{loading ? '—' : activeCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-zen-bg rounded-2xl p-1">
        {(['all', 'pending', 'active'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all ${
              filter === f
                ? 'bg-white text-zen-ink shadow-sm'
                : 'text-zen-ink/40'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'pending' ? 'Menunggu' : 'Aktif'}
          </button>
        ))}
      </div>

      {/* Card list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-zen-ink/5">
            <Calendar size={32} className="text-zen-ink/20 mx-auto mb-3" />
            <p className="text-sm text-zen-ink/40">
              {filter === 'pending' ? 'Tidak ada yang menunggu' : filter === 'active' ? 'Belum ada yang aktif' : 'Belum ada pendaftaran'}
            </p>
          </div>
        ) : (
          filtered.map(license => (
            <LicenseCard
              key={license.id}
              license={license}
              onApprove={() => handleApprove(license)}
              onReject={() => handleReject(license)}
              isProcessing={actionLoading === license.id}
            />
          ))
        )}
      </div>

      {confirm.open && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          onConfirm={() => { setConfirm(p => ({ ...p, open: false })); confirm.onConfirm(); }}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      )}

      {approvedLicense && (
        <LicenseKeyModal
          licenseKey={approvedLicense.license_key}
          studioName={approvedLicense.studio_name}
          onClose={() => setApprovedLicense(null)}
        />
      )}
    </div>
  );
}
