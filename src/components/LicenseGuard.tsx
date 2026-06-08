import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isActivated, isWithinGracePeriod, isLicenseExpired, validateLicense, clearStoredLicense } from '@/services/license';
import { ShieldAlert, KeyRound, WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

export function LicenseGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'active' | 'demo' | 'expired' | 'locked'>('loading');
  const [lockReason, setLockReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    if (!isActivated()) { setStatus('demo'); return; }
    if (isLicenseExpired()) { setStatus('expired'); return; }

    if (navigator.onLine) {
      const result = await validateLicense();
      if (!result.ok) {
        setLockReason(result.error);
        setStatus('locked');
        return;
      }
    } else if (!isWithinGracePeriod()) {
      setLockReason('Perangkat offline dan melewati batas toleransi. Sambungkan ke internet untuk validasi ulang.');
      setStatus('locked');
      return;
    }

    setStatus('active');
  }

  if (status === 'loading') return null;
  if (status === 'active') return <>{children}</>;

  if (status === 'demo') {
    return (
      <div className="relative">
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
  const isLocked = status === 'locked';
  const isOfflineLock = isLocked && lockReason.includes('offline');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
        {status === 'expired'
          ? <ShieldAlert size={36} className="text-red-500" />
          : isOfflineLock
            ? <WifiOff size={36} className="text-red-500" />
            : <ShieldAlert size={36} className="text-red-500" />
        }
      </div>
      <h2 className="text-xl font-bold mb-2">
        {status === 'expired' ? 'Lisensi Expired' : 'Lisensi Tidak Valid'}
      </h2>
      <p className="text-zen-ink/60 text-sm max-w-md mb-2">
        {status === 'expired'
          ? 'Masa berlaku lisensi sudah habis.'
          : lockReason}
      </p>
      {isLocked && !isOfflineLock && (
        <p className="text-zen-ink/40 text-xs max-w-sm mb-6">
          Jika ini bukan perangkat Anda, hubungi developer untuk reset lisensi.
          Atau cek status lisensi di menu <strong>Pengaturan → Status Lisensi</strong>.
        </p>
      )}
      {!isLocked && <div className="mb-6" />}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {isOfflineLock && (
          <Button variant="primary" onClick={() => window.location.reload()}>Refresh Halaman</Button>
        )}
        <Button variant={isOfflineLock ? 'secondary' : 'primary'} onClick={() => navigate('/activation')}>
          Aktivasi Ulang
        </Button>
        <Button variant="secondary" onClick={() => navigate('/settings')}>
          Lihat Status Lisensi
        </Button>
        <button
          onClick={() => { clearStoredLicense(); window.location.reload(); }}
          className="flex items-center justify-center gap-1.5 text-xs text-zen-ink/30 hover:text-zen-ink/60 transition-colors py-2"
        >
          <RotateCcw size={11} />
          Reset ke mode demo
        </button>
      </div>
    </div>
  );
}
