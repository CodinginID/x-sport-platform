import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'id' | 'en';

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: 'id',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'xsport-lang' }
  )
);
