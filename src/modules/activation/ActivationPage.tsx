import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { activateLicense } from '@/services/license';
import { useStudioStore } from '@/stores/studio';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2, ShieldCheck, Trash2, Users, Unlock,
  Loader2, Clock, KeyRound, Copy, Check,
} from 'lucide-react';

interface LicenseStatus {
  license_key: string;
  is_active: boolean;
  studio_name: string | null;
  activated_at: string | null;
}

export default function ActivationPage() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const setStudioName = useStudioStore(s => s.setName);
  const setStudioAddress = useStudioStore(s => s.setAddress);

  // Auto-fetch license berdasarkan email owner yang login
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      setFetching(true);
      const { data } = await supabase
        .from('licenses')
        .select('license_key, is_active, studio_name, activated_at')
        .eq('owner_email', user.email)
        .maybeSingle();
      setLicenseStatus(data ?? null);
      setFetching(false);
    })();
  }, [user?.email]);

  const copyKey = () => {
    if (!licenseStatus) return;
    navigator.clipboard.writeText(licenseStatus.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!licenseStatus) return;
    setError('');
    if (!navigator.onLine) { setError('Koneksi internet diperlukan untuk aktivasi'); return; }
    setLoading(true);
    const result = await activateLicense({
      licenseKey: licenseStatus.license_key,
      studioName: '', studioAddress: '', ownerEmail: '',
    });
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    const stored = localStorage.getItem('xsport-license');
    if (stored) {
      const lic = JSON.parse(stored);
      if (lic.studio_name) setStudioName(lic.studio_name);
      if (lic.studio_address) setStudioAddress(lic.studio_address);
    }
    setSuccess(true);
  };

  // ── Success ──
  if (success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Aktivasi Lisensi</h1>
        <div className="max-w-md mx-auto text-center py-8">
          <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500" size={40} />
          </div>
          <h2 className="text-xl font-bold mb-2">Aktivasi Berhasil!</h2>
          <p className="text-zen-ink/50 text-sm mb-8">Aplikasi sudah aktif dan siap digunakan sepenuhnya.</p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
            Ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aktivasi Lisensi</h1>

      {/* Demo mode banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Aplikasi berjalan dalam mode demo</p>
          <p className="text-xs text-amber-700 mt-0.5">Data yang tampil hanya contoh. Aktifkan lisensi untuk mulai menggunakan secara penuh.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Status card ── */}
        <Card title="Status Lisensi">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-zen-brand" />
            </div>
          ) : !licenseStatus ? (
            /* Tidak ada license ditemukan untuk email ini */
            <div className="text-center py-6 space-y-3">
              <KeyRound size={32} className="text-zen-ink/20 mx-auto" />
              <p className="text-sm text-zen-ink/50">Tidak ada lisensi ditemukan untuk akun ini.</p>
              <p className="text-xs text-zen-ink/30">Pastikan Anda sudah registrasi studio terlebih dahulu.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Studio info */}
              <div className="bg-zen-bg rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Studio</p>
                <p className="font-bold">{licenseStatus.studio_name || '—'}</p>
                <p className="text-xs text-zen-ink/40 mt-0.5">{user?.email}</p>
              </div>

              {/* License key */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">License Key</p>
                <button
                  onClick={copyKey}
                  className="w-full flex items-center justify-between gap-3 bg-zen-bg rounded-2xl px-4 py-3 group hover:bg-zen-brand/5 transition-colors"
                >
                  <span className="font-mono font-bold text-zen-brand tracking-widest text-sm">
                    {licenseStatus.license_key}
                  </span>
                  {copied
                    ? <Check size={15} className="text-green-500 shrink-0" />
                    : <Copy size={15} className="text-zen-ink/30 group-hover:text-zen-ink/60 shrink-0" />
                  }
                </button>
              </div>

              {/* Status & action */}
              {error && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-2xl">{error}</div>
              )}

              {!licenseStatus.is_active ? (
                /* Menunggu approval */
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Menunggu persetujuan</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Admin sedang memproses pendaftaran Anda. Silakan cek kembali dalam 1×24 jam.
                    </p>
                  </div>
                </div>
              ) : licenseStatus.activated_at ? (
                /* Sudah pernah diaktivasi */
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-900">Lisensi sudah aktif</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Aktivasi ulang akan me-reset data lokal dan sinkronisasi ulang dari server.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Activate button — hanya tampil kalau approved */}
              {licenseStatus.is_active && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                  onClick={handleActivate}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Mengaktifkan...</span>
                    : <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} />
                        {licenseStatus.activated_at ? 'Aktivasi Ulang' : 'Aktivasi Sekarang'}
                      </span>
                  }
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* ── Info card ── */}
        <Card title="Yang Terjadi Setelah Aktivasi">
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Data demo dihapus</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Semua data contoh akan dihapus dan diganti dengan data studio Anda.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Users size={15} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Akun admin di-provision</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Akun admin/staff yang disiapkan akan otomatis tersedia untuk login.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Unlock size={15} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Fitur penuh terbuka</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Semua fitur dapat digunakan tanpa batasan mode demo.</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
