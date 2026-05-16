import { useState, useEffect } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: DeferredPromptEvent | null = null;

const DISMISS_KEY = 'xsport-install-dismissed-at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ reports as Mac; check for touch as a tiebreaker
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function wasRecentlyDismissed(): boolean {
  const at = localStorage.getItem(DISMISS_KEY);
  if (!at) return false;
  return Date.now() - Number(at) < DISMISS_TTL_MS;
}

export function InstallPWA() {
  const [show, setShow] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    if (isIOS()) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as DeferredPromptEvent;
      setShow(true);
    };
    const installed = () => {
      setShow(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      setIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
    setIosHelp(false);
  };

  if (!show && !iosHelp) return null;

  if (iosHelp) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={handleDismiss}>
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold">Install X-Sport</h3>
            <button onClick={handleDismiss} className="text-zen-ink/40"><X size={18} /></button>
          </div>
          <p className="text-sm text-zen-ink/70 mb-4">Untuk install di iPhone/iPad, ikuti langkah ini di Safari:</p>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3 items-start"><span className="font-bold">1.</span><span>Tap tombol <Share size={14} className="inline mx-1" /> <b>Share</b> di bar bawah Safari.</span></li>
            <li className="flex gap-3 items-start"><span className="font-bold">2.</span><span>Scroll dan pilih <Plus size={14} className="inline mx-1" /> <b>Add to Home Screen</b>.</span></li>
            <li className="flex gap-3 items-start"><span className="font-bold">3.</span><span>Tap <b>Add</b> di pojok kanan atas.</span></li>
          </ol>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 mt-4">
            ⚠️ Penting: install ke home screen agar data offline lebih persisten dan tidak dihapus iOS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-20 z-40 flex items-center gap-2 animate-page-in lg:right-6 lg:bottom-6">
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 bg-zen-brand text-white px-4 py-3 rounded-2xl shadow-lg shadow-zen-brand/30 text-[10px] uppercase tracking-widest font-bold hover:bg-zen-ink transition-all"
      >
        <Download size={16} /> Install App
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Tutup"
        className="bg-white text-zen-ink/60 w-9 h-9 rounded-2xl shadow flex items-center justify-center hover:text-zen-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}
