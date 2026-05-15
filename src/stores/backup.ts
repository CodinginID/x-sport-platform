import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BackupState {
  studioId: string | null;
  pin: string | null;
  lastBackupAt: string | null;
  autoBackupEnabled: boolean;
  isBackingUp: boolean;
  setCredentials: (studioId: string, pin: string) => void;
  setLastBackup: (date: string) => void;
  setAutoBackup: (enabled: boolean) => void;
  setIsBackingUp: (v: boolean) => void;
}

function generateStudioId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'XSP-';
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createNewCredentials() {
  return { studioId: generateStudioId(), pin: generatePin() };
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      studioId: null,
      pin: null,
      lastBackupAt: null,
      autoBackupEnabled: true,
      isBackingUp: false,
      setCredentials: (studioId, pin) => set({ studioId, pin }),
      setLastBackup: (date) => set({ lastBackupAt: date }),
      setAutoBackup: (enabled) => set({ autoBackupEnabled: enabled }),
      setIsBackingUp: (v) => set({ isBackingUp: v }),
    }),
    { name: 'xsport-backup' }
  )
);
