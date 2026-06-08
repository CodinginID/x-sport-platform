import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { activateLicense, type StaffCredentials } from '@/services/license';
import { useStudioStore } from '@/stores/studio';
import { useAuthStore } from '@/stores/auth';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2, ShieldCheck, Trash2, Users, Unlock,
  Loader2, Clock, KeyRound, Copy, Check, Smartphone, AlertTriangle, Search,
  Eye, EyeOff, UserCircle,
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
  const [fetchError, setFetchError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedStaff, setGeneratedStaff] = useState<StaffCredentials | null>(null);
  const [showStaffPw, setShowStaffPw] = useState(false);
  const [copiedStaff, setCopiedStaff] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [manualSearching, setManualSearching] = useState(false);
  const navigate = useNavigate();
  const confirm = useConfirmStore(s => s.show);
  const user = useAuthStore(s => s.user);
  const setStudioName = useStudioStore(s => s.setName);
  const setStudioAddress = useStudioStore(s => s.setAddress);

  // Auto-fetch by owner_email
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      setFetching(true);
      setFetchError('');
      // Use limit(1) + order — .maybeSingle() errors when owner has multiple licenses
      const { data: rows, error: sbError } = await supabase
        .from('licenses')
        .select('license_key, is_active, studio_name, activated_at')
        .eq('owner_email', user.email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sbError) {
        setFetchError(sbError.message);
      }
      setLicenseStatus(rows?.[0] ?? null);
      setFetching(false);
    })();
  }, [user?.email]);

  // Manual search by license key
  const handleManualSearch = async () => {
    const key = manualKey.trim();
    if (!key) return;
    setManualSearching(true);
    setFetchError('');
    setError('');
    const { data, error: sbError } = await supabase
      .from('licenses')
      .select('license_key, is_active, studio_name, activated_at')
      .eq('license_key', key)
      .maybeSingle();
    setManualSearching(false);
    if (sbError) {
      setFetchError(sbError.message);
      return;
    }
    if (!data) {
      setFetchError('License key tidak ditemukan. Pastikan key sudah benar.');
      return;
    }
    setLicenseStatus(data);
  };

  const copyKey = () => {
    if (!licenseStatus) return;
    navigator.clipboard.writeText(licenseStatus.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const doActivate = async () => {
    if (!licenseStatus) return;
    setError('');
    if (!navigator.onLine) { setError('Koneksi internet diperlukan untuk aktivasi'); return; }
    setLoading(true);
    const result = await activateLicense({
      licenseKey: licenseStatus.license_key,
      studioName: '', studioAddress: '', ownerEmail: user?.email ?? '',
    });
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    if (result.data) {
      await useAuthStore.getState().updateLicenseInfo(result.data);
      if (result.data.studio_name) setStudioName(result.data.studio_name);
      if (result.data.studio_address) setStudioAddress(result.data.studio_address);
    }
    if (result.generatedStaff) {
      setGeneratedStaff(result.generatedStaff);
    }
    setSuccess(true);
  };

  const handleActivate = () => {
    if (!licenseStatus) return;
    if (licenseStatus.activated_at) {
      confirm({
        title: 'Aktivasi Ulang?',
        message: 'Semua data lokal (member, booking, transaksi) akan dihapus dan di-sync ulang dari server. Tindakan ini tidak bisa dibatalkan.',
        variant: 'danger',
        onConfirm: doActivate,
      });
    } else {
      doActivate();
    }
  };

  // ── Success ──
  if (success) {
    const copyStaffCreds = () => {
      if (!generatedStaff) return;
      navigator.clipboard.writeText(`Email: ${generatedStaff.email}\nPassword: ${generatedStaff.password}`);
      setCopiedStaff(true);
      setTimeout(() => setCopiedStaff(false), 2000);
    };

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Aktivasi Lisensi</h1>
        <div className="max-w-md mx-auto space-y-5 py-4">
          {/* Success icon */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-green-500" size={40} />
            </div>
            <h2 className="text-xl font-bold mb-1">Aktivasi Berhasil!</h2>
            <p className="text-zen-ink/50 text-sm">Aplikasi sudah aktif dan siap digunakan sepenuhnya.</p>
          </div>

          {/* Generated staff credentials */}
          {generatedStaff && (
            <div className="bg-white rounded-3xl border border-zen-ink/8 overflow-hidden">
              <div className="px-5 py-4 border-b border-zen-ink/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <UserCircle size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Akun Staff Dibuat Otomatis</p>
                  <p className="text-[11px] text-zen-ink/40">Simpan kredensial ini untuk diberikan ke staff</p>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Email */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Email Login</p>
                  <p className="text-sm font-mono font-bold text-zen-ink">{generatedStaff.email}</p>
                </div>
                {/* Password */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-bold text-zen-ink tracking-widest">
                      {showStaffPw ? generatedStaff.password : '••••••••'}
                    </p>
                    <button
                      onClick={() => setShowStaffPw(v => !v)}
                      className="text-zen-ink/30 hover:text-zen-ink transition-colors"
                    >
                      {showStaffPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {/* Copy button */}
                <button
                  onClick={copyStaffCreds}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-zen-ink/10 rounded-2xl text-sm font-bold text-zen-ink/60 hover:bg-zen-bg transition-colors"
                >
                  {copiedStaff ? <><Check size={14} className="text-green-500" /> Tersalin!</> : <><Copy size={14} /> Salin Kredensial</>}
                </button>
              </div>

              {/* Warning */}
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
                <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Password hanya ditampilkan sekali. Nama dan password staff bisa diubah kapan saja di Settings → Manajemen Staff.
                </p>
              </div>
            </div>
          )}

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
            /* Tidak ada lisensi ditemukan */
            <div className="space-y-4">
              <div className="text-center py-4 space-y-2">
                <KeyRound size={32} className="text-zen-ink/20 mx-auto" />
                <p className="text-sm font-bold text-zen-ink/60">Lisensi tidak ditemukan</p>
                <p className="text-xs text-zen-ink/30">
                  Dicari dengan email: <span className="font-bold text-zen-ink/50">{user?.email}</span>
                </p>
              </div>

              {/* Supabase / search error */}
              {fetchError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-red-600">{fetchError}</p>
                </div>
              )}

              {/* Manual key input */}
              <div className="pt-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">
                  Atau masukkan license key manual
                </p>
                <div className="flex gap-2">
                  <input
                    value={manualKey}
                    onChange={e => setManualKey(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                    placeholder="XXXX-XXXX-XXXX"
                    className="flex-1 bg-zen-bg rounded-2xl px-4 py-3 text-sm font-mono font-bold text-zen-brand placeholder:text-zen-ink/20 placeholder:font-normal outline-none focus:ring-2 ring-zen-brand/20"
                  />
                  <button
                    onClick={handleManualSearch}
                    disabled={!manualKey.trim() || manualSearching}
                    className="px-4 py-3 rounded-2xl bg-zen-brand text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {manualSearching
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Search size={16} />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-zen-ink/30 mt-2">
                  Hubungi developer jika belum punya license key.
                </p>
              </div>
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

              {/* Status & action error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
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
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-900">Lisensi sudah terikat ke perangkat ini</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      "Aktivasi Ulang" akan <strong>menghapus semua data lokal</strong> (member, booking, transaksi) dan sync ulang dari server. Lakukan hanya jika data bermasalah.
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

              {/* Back to search */}
              <button
                onClick={() => { setLicenseStatus(null); setManualKey(''); setError(''); setFetchError(''); }}
                className="w-full text-[10px] uppercase tracking-widest font-bold text-zen-ink/25 hover:text-zen-ink/50 transition-colors py-1"
              >
                Cari dengan key lain
              </button>
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
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone size={15} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Lisensi terikat ke 1 perangkat</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">
                  Jika ingin pindah HP/PC baru, hubungi developer untuk reset perangkat. Lisensi tidak bisa dipakai di 2 tempat sekaligus.
                </p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
