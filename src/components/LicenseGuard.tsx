import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isActivated, isWithinGracePeriod, isLicenseExpired, validateLicense } from '@/services/license';
import { ShieldAlert, KeyRound, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui';

export function LicenseGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'active' | 'demo' | 'expired' | 'locked'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    if (!isActivated()) { setStatus('demo'); return; }
    if (isLicenseExpired()) { setStatus('expired'); return; }

    // If online, re-validate
    if (navigator.onLine) {
      const result = await validateLicense();
      if (!result.ok) { setStatus('locked'); return; }
    } else if (!isWithinGracePeriod()) {
      setStatus('locked'); return;
    }

    setStatus('active');
  }

  if (status === 'loading') return null;
  if (status === 'active') return <>{children}</>;

  if (status === 'demo') {
    return (
      <div className="relative">
        {/* Demo banner */}
        <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Mode Demo — Data hanya contoh</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/activation')}>Aktivasi Lisensi</Button>
        </div>
        <div className="pointer-events-none opacity-75 select-none">{children}</div>
      </div>
    );
  }

  // Expired or locked
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
        {status === 'expired' ? <ShieldAlert size={36} className="text-red-500" /> : <WifiOff size={36} className="text-red-500" />}
      </div>
      <h2 className="text-xl font-bold mb-2">
        {status === 'expired' ? 'Lisensi Expired' : 'Validasi Diperlukan'}
      </h2>
      <p className="text-zen-ink/60 text-sm max-w-md mb-6">
        {status === 'expired'
          ? 'Lisensi Anda sudah habis masa berlakunya. Hubungi developer untuk perpanjang.'
          : 'Aplikasi perlu koneksi internet untuk validasi ulang lisensi. Sambungkan ke internet dan refresh halaman.'}
      </p>
      {status === 'expired' && (
        <Button variant="primary" onClick={() => navigate('/activation')}>Aktivasi Ulang</Button>
      )}
    </div>
  );
}
