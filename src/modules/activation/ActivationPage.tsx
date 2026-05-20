import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui';
import { activateLicense, type ActivationData } from '@/services/license';
import { useStudioStore } from '@/stores/studio';
import { KeyRound, Loader2, CheckCircle2, ShieldCheck, Trash2, Users, Unlock } from 'lucide-react';

export default function ActivationPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const setStudioName = useStudioStore((s) => s.setName);
  const setStudioAddress = useStudioStore((s) => s.setAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!navigator.onLine) { setError('Koneksi internet diperlukan untuk aktivasi'); return; }
    if (!licenseKey.trim()) { setError('License key wajib diisi'); return; }

    setLoading(true);
    const activation: ActivationData = { licenseKey: licenseKey.trim(), studioName: '', studioAddress: '', ownerEmail: '' };
    const result = await activateLicense(activation);
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

      {/* Demo mode warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Aplikasi berjalan dalam mode demo</p>
          <p className="text-xs text-amber-700 mt-0.5">Data yang tampil hanya contoh. Aktifkan lisensi untuk mulai menggunakan aplikasi secara penuh.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation form */}
        <Card title="Masukkan License Key">
          <p className="text-sm text-zen-ink/50 mb-6">
            Masukkan license key yang Anda terima saat registrasi. Format: <span className="font-mono font-bold text-zen-brand">XSP-XXXXX-XXXXX</span>
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="License Key"
              placeholder="XSP-XXXXX-XXXXX"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              autoFocus
              required
            />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Mengaktifkan...</span>
                : <span className="flex items-center justify-center gap-2"><KeyRound size={16} /> Aktivasi Sekarang</span>
              }
            </Button>
          </form>
        </Card>

        {/* Info card */}
        <Card title="Yang Terjadi Setelah Aktivasi">
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Data demo dihapus</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Semua data contoh akan dihapus dan diganti dengan data studio Anda yang sesungguhnya.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Users size={15} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Akun admin di-provision</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Akun admin/staff yang telah disiapkan akan otomatis tersedia untuk login.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Unlock size={15} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Fitur penuh terbuka</p>
                <p className="text-xs text-zen-ink/50 mt-0.5">Semua fitur aplikasi dapat digunakan tanpa batasan mode demo.</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
