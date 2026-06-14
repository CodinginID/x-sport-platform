import { useEffect } from 'react';
import { usePrinterStore } from '@/stores/printer';
import * as bt from '@/services/btPrinter';

export function usePrinterAutoReconnect() {
  const deviceId = usePrinterStore((s) => s.deviceId);
  const deviceName = usePrinterStore((s) => s.deviceName);
  const status = usePrinterStore((s) => s.status);
  const isPermissionLost = usePrinterStore((s) => s.isPermissionLost);
  const { setStatus, setSearching, setPermissionLost } = usePrinterStore.getState();

  useEffect(() => {
    if (!bt.isSupported() || !deviceId) return;
    // Browser tanpa getDevices() tidak bisa auto-reconnect — jangan jalankan loop
    // yang pasti gagal. UI akan tampilkan tombol "satu-tap" sebagai gantinya.
    if (!bt.canAutoReconnect()) { setSearching(false); return; }
    setPermissionLost(false);
    setSearching(true);

    const onConnected = () => { setStatus('connected'); setSearching(false); setPermissionLost(false); };

    const navType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
    const startupDelay = navType === 'reload' ? 1500 : 500;

    const startupTimer = setTimeout(async () => {
      const result = await bt.reconnect(deviceId, deviceName);
      if (result === 'connected') { onConnected(); }
    }, startupDelay);

    bt.watchForDevice(deviceId, onConnected);
    const stop = bt.startBackgroundReconnect(deviceId, onConnected);

    return () => { clearTimeout(startupTimer); stop(); setSearching(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    if (status === 'connected') { setSearching(false); setPermissionLost(false); }
    if (status === 'disconnected' && !!deviceId && !isPermissionLost) setSearching(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, deviceId, isPermissionLost]);
}
