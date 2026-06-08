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
  setPaperSize: (p: PaperSize) => void;
  setAutoPrint: (v: boolean) => void;
  setDevice: (id: string, name?: string) => void;
  forgetDevice: () => void;
  setStatus: (s: PrinterStatus) => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      paperSize: '58',
      autoPrint: true,
      status: 'disconnected',
      setPaperSize: (paperSize) => set({ paperSize }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setDevice: (deviceId, deviceName) => set({ deviceId, deviceName }),
      forgetDevice: () => set({ deviceId: undefined, deviceName: undefined, status: 'disconnected' }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: 'xsport-printer',
      partialize: (s) => ({ deviceId: s.deviceId, deviceName: s.deviceName, paperSize: s.paperSize, autoPrint: s.autoPrint }),
    },
  ),
);
