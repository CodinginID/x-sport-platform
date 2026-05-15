import { useState, useEffect } from 'react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-60 animate-slide-down bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
      📡 Offline — data tersimpan lokal
    </div>
  );
}
