import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StudioState {
  name: string;
  address: string;
  lowStockThreshold: number;
  setName: (name: string) => void;
  setAddress: (address: string) => void;
  setLowStockThreshold: (threshold: number) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      name: 'X-Sport Studio',
      address: 'Jl. Olahraga No. 1, Jakarta',
      lowStockThreshold: 5,
      setName: (name) => set({ name }),
      setAddress: (address) => set({ address }),
      setLowStockThreshold: (threshold) => set({ lowStockThreshold: threshold }),
    }),
    { name: 'xsport-studio' }
  )
);
