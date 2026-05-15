import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

let deferredPrompt: any = null;

export function InstallPWA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Hide if already installed
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    deferredPrompt = null;
  };

  if (!show) return null;

  return (
    <button onClick={handleInstall}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zen-brand text-white px-4 py-3 rounded-2xl shadow-lg shadow-zen-brand/30 text-[10px] uppercase tracking-widest font-bold hover:bg-zen-ink transition-all animate-page-in lg:top-6 lg:right-6">
      <Download size={16} /> Install App
    </button>
  );
}
