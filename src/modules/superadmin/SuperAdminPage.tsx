import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createAdminClient } from '@/lib/supabaseAdmin';
import {
  ShieldCheck, LogOut, RefreshCw, Check, Copy, X,
  Loader2, Eye, EyeOff, CheckCircle2, XCircle,
  Clock, KeyRound,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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

type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Session storage key ──────────────────────────────────────────────────────

const SESSION_KEY = 'xsport_admin_sk';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

function planLabel(plan: string | null): string {
  if (!plan) return '—';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ─── Toast (self-contained, no store dependency) ─────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

function useLocalToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, variant: ToastItem['variant'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, add, remove };
}

const toastStyles: Record<ToastItem['variant'], string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-zen-brand text-white',
};

// ─── License Key Modal ────────────────────────────────────────────────────────

interface LicenseKeyModalProps {
  licenseKey: string;
  studioName: string | null;
  onClose: () => void;
}

function LicenseKeyModal({ licenseKey, studioName, onClose }: LicenseKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={onClose}>
      <div
        className="glass-card rounded-[32px] p-8 max-w-sm w-full mx-4 text-center space-y-6 animate-page-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Lisensi Disetujui</p>
          <h2 className="text-lg font-bold">{studioName || 'Studio'}</h2>
        </div>

        <button
          onClick={copy}
          className="w-full bg-zen-bg rounded-2xl p-5 relative group hover:bg-zen-brand/5 transition-colors cursor-pointer text-left"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">License Key</p>
          <p className="text-xl font-mono font-bold tracking-[0.12em] text-zen-brand break-all">{licenseKey}</p>
          <div className="absolute top-4 right-4 text-zen-ink/30 group-hover:text-zen-ink/60 transition-colors">
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
          </div>
        </button>

        <p className="text-xs text-zen-ink/50">
          Klik box di atas untuk menyalin. Bagikan key ini ke studio owner.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 px-6 rounded-2xl bg-zen-brand text-white text-[10px] uppercase tracking-widest font-bold hover:bg-zen-ink transition-colors min-h-[44px]"
        >
          Selesai
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Confirm Dialog (self-contained) ─────────────────────────────────────────

interface ConfirmProps {
  title: string;
  message: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, variant, onConfirm, onCancel }: ConfirmProps) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={onCancel}>
      <div className="glass-card rounded-[24px] p-6 max-w-sm w-full mx-4 space-y-4 animate-page-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-zen-ink/60">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-2xl border border-zen-ink/10 hover:bg-zen-bg transition-colors min-h-[44px]"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-2xl text-white min-h-[44px] transition-colors ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-zen-ink/5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-zen-ink/8 rounded-xl animate-pulse" style={{ width: `${50 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────

interface AuthGateProps {
  onAuth: (client: AdminClient, key: string) => void;
}

function AuthGate({ onAuth }: AuthGateProps) {
  const [serviceKey, setServiceKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serviceKey.trim()) {
      setError('Service key wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const client = createAdminClient(serviceKey.trim());
      // Validate by doing a real query
      const { error: fetchError } = await client
        .from('licenses')
        .select('id')
        .limit(1);

      if (fetchError) {
        setError('Service key tidak valid atau tidak punya akses: ' + fetchError.message);
        setLoading(false);
        return;
      }

      sessionStorage.setItem(SESSION_KEY, serviceKey.trim());
      onAuth(client, serviceKey.trim());
    } catch (err) {
      setError('Gagal terhubung ke Supabase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zen-bg p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-zen-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck size={28} className="text-zen-brand" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-zen-ink">
            X<span className="text-zen-brand italic">Sport</span> Admin
          </h1>
          <p className="text-zen-ink/50 text-sm mt-2">Super Admin Dashboard</p>
        </div>

        <div className="glass-card rounded-[40px] p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zen-ink/50 mb-2">
                Supabase Service Role Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={serviceKey}
                  onChange={(e) => setServiceKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-zen-bg border border-zen-ink/10 rounded-2xl px-4 py-3 pr-12 text-sm font-mono focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20 transition-all min-h-[44px]"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/40 hover:text-zen-ink transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-zen-ink/40 mt-2 leading-relaxed">
                Dapatkan dari Supabase Dashboard → Settings → API → service_role key
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zen-brand text-white text-[10px] uppercase tracking-widest font-bold rounded-2xl hover:bg-zen-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2 shadow-lg shadow-zen-brand/20"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memvalidasi...
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  Masuk ke Admin
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  adminClient: AdminClient;
  onLogout: () => void;
  toast: ReturnType<typeof useLocalToast>;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
}

function Dashboard({ adminClient, onLogout, toast }: DashboardProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedLicense, setApprovedLicense] = useState<License | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: '', message: '', variant: 'danger', onConfirm: () => {},
  });

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminClient
      .from('licenses')
      .select('id, license_key, studio_name, owner_email, owner_phone, plan, created_at, is_active')
      .order('created_at', { ascending: false });

    if (error) {
      toast.add('Gagal memuat data: ' + error.message, 'error');
    } else {
      setLicenses((data as License[]) ?? []);
    }
    setLoading(false);
  }, [adminClient, toast]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const openConfirm = (opts: Omit<ConfirmState, 'open'>) => {
    setConfirm({ ...opts, open: true });
  };

  const closeConfirm = () => setConfirm((prev) => ({ ...prev, open: false }));

  const handleApprove = (license: License) => {
    openConfirm({
      title: 'Setujui Lisensi?',
      message: `Aktifkan lisensi untuk studio "${license.studio_name || license.owner_email}"? Studio akan dapat menggunakan aplikasi penuh.`,
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(license.id);
        const { error } = await adminClient
          .from('licenses')
          .update({ is_active: true })
          .eq('id', license.id);

        if (error) {
          toast.add('Gagal menyetujui: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }

        await fetchLicenses();
        setActionLoading(null);

        // Show the approved license after fresh data is loaded
        setApprovedLicense({ ...license, is_active: true });
        toast.add(`Lisensi untuk ${license.studio_name || license.owner_email} disetujui`, 'success');
      },
    });
  };

  const handleReject = (license: License) => {
    openConfirm({
      title: 'Tolak & Hapus Lisensi?',
      message: `Hapus pendaftaran dari "${license.studio_name || license.owner_email}"? Tindakan ini tidak bisa dibatalkan.`,
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(license.id);
        const { error } = await adminClient
          .from('licenses')
          .delete()
          .eq('id', license.id);

        if (error) {
          toast.add('Gagal menolak: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }

        await fetchLicenses();
        setActionLoading(null);
        toast.add(`Pendaftaran ${license.studio_name || license.owner_email} dihapus`, 'error');
      },
    });
  };

  const pendingCount = licenses.filter((l) => !l.is_active).length;
  const activeCount = licenses.filter((l) => l.is_active).length;

  return (
    <div className="min-h-screen bg-zen-bg">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zen-ink/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zen-brand/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-zen-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-zen-ink leading-none">
                X<span className="text-zen-brand italic">Sport</span> Admin
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mt-0.5">Super Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLicenses}
              disabled={loading}
              className="w-9 h-9 rounded-2xl border border-zen-ink/10 flex items-center justify-center text-zen-ink/50 hover:text-zen-ink hover:border-zen-ink/20 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-zen-ink/10 text-[10px] uppercase tracking-widest font-bold text-zen-ink/50 hover:text-red-500 hover:border-red-200 transition-colors min-h-[44px]"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-3xl p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Total Lisensi</p>
            <p className="text-3xl font-bold font-serif">{licenses.length}</p>
          </div>
          <div className="glass-card rounded-3xl p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500/80 mb-2">Menunggu Approval</p>
            <p className="text-3xl font-bold font-serif text-amber-500">{pendingCount}</p>
          </div>
          <div className="glass-card rounded-3xl p-5 col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500/80 mb-2">Aktif</p>
            <p className="text-3xl font-bold font-serif text-emerald-500">{activeCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zen-ink/5 flex items-center justify-between">
            <h2 className="text-sm font-bold">Semua Pendaftaran</h2>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full">
                {pendingCount} menunggu
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zen-ink/5">
                  {['Nama Studio', 'Email Owner', 'No. HP', 'Plan', 'Tanggal Daftar', 'Status', 'License Key', 'Aksi'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-zen-ink/40"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-zen-ink/40">
                      Belum ada pendaftaran
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => {
                    const isPending = !license.is_active;
                    const isProcessing = actionLoading === license.id;

                    return (
                      <tr
                        key={license.id}
                        className={`border-b border-zen-ink/5 transition-colors ${
                          isPending ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-zen-bg/50'
                        }`}
                      >
                        {/* Studio Name */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-zen-ink truncate max-w-[160px]">
                            {license.studio_name || '—'}
                          </p>
                        </td>

                        {/* Owner Email */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-zen-ink/70 truncate max-w-[180px]">
                            {license.owner_email || '—'}
                          </p>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-zen-ink/60 font-mono">
                            {license.owner_phone || '—'}
                          </p>
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-4">
                          <span className="bg-zen-brand/10 text-zen-brand text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full">
                            {planLabel(license.plan)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-zen-ink/60 whitespace-nowrap">
                            {formatDate(license.created_at)}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-full">
                              <Clock size={10} />
                              Menunggu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-full">
                              <CheckCircle2 size={10} />
                              Aktif
                            </span>
                          )}
                        </td>

                        {/* License Key */}
                        <td className="px-4 py-4">
                          {isPending ? (
                            <span className="text-zen-ink/30 text-sm">—</span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-zen-brand bg-zen-brand/8 px-2.5 py-1.5 rounded-xl">
                              {license.license_key}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(license)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
                              >
                                {isProcessing ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Check size={11} />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(license)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
                              >
                                {isProcessing ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <XCircle size={11} />
                                )}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-zen-ink/20 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirm dialog */}
      {confirm.open && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          onConfirm={() => { closeConfirm(); confirm.onConfirm(); }}
          onCancel={closeConfirm}
        />
      )}

      {/* License key reveal modal */}
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

// ─── Toast Renderer ───────────────────────────────────────────────────────────

function ToastLayer({ toasts, remove }: { toasts: ToastItem[]; remove: (id: string) => void }) {
  if (!toasts.length) return null;
  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:top-6 md:right-6 md:bottom-auto z-[100] flex flex-col gap-2 w-[90vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-[slideIn_0.2s_ease] ${toastStyles[t.variant]}`}
        >
          {t.variant === 'success' && <CheckCircle2 size={16} />}
          {t.variant === 'error' && <XCircle size={16} />}
          {t.variant === 'info' && <ShieldCheck size={16} />}
          <span className="flex-1 text-sm font-medium">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const toast = useLocalToast();
  const [adminClient, setAdminClient] = useState<AdminClient | null>(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return createAdminClient(stored);
    return null;
  });

  const handleAuth = (client: AdminClient) => {
    setAdminClient(client);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminClient(null);
  };

  return (
    <>
      {adminClient ? (
        <Dashboard adminClient={adminClient} onLogout={handleLogout} toast={toast} />
      ) : (
        <AuthGate onAuth={handleAuth} />
      )}
      <ToastLayer toasts={toast.toasts} remove={toast.remove} />
    </>
  );
}
