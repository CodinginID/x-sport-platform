import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaperSize } from '@/services/escpos';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected';

interface PrinterState {
  deviceId?: string;
  deviceName?: string;
  paperSize: PaperSize;
  autoPrint: boolean;
  status: PrinterStatus; // runtime saja, tidak dipersist
  isSearching: boolean;
  isPermissionLost: boolean;
  setPaperSize: (p: PaperSize) => void;
  setAutoPrint: (v: boolean) => void;
  setDevice: (id: string, name?: string) => void;
  forgetDevice: () => void;
  setStatus: (s: PrinterStatus) => void;
  setSearching: (v: boolean) => void;
  setPermissionLost: (v: boolean) => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      paperSize: '58',
      autoPrint: true,
      status: 'disconnected',
      isSearching: false,
      isPermissionLost: false,
      setPaperSize: (paperSize) => set({ paperSize }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setDevice: (deviceId, deviceName) => set({ deviceId, deviceName }),
      forgetDevice: () => set({ deviceId: undefined, deviceName: undefined, status: 'disconnected', isSearching: false, isPermissionLost: false }),
      setStatus: (status) => set({ status }),
      setSearching: (isSearching) => set({ isSearching }),
      setPermissionLost: (isPermissionLost) => set({ isPermissionLost }),
    }),
    {
      name: 'xsport-printer',
      partialize: (s) => ({ deviceId: s.deviceId, deviceName: s.deviceName, paperSize: s.paperSize, autoPrint: s.autoPrint }),
    },
  ),
);
