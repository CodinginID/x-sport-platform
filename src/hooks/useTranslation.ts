import { useLanguageStore } from '@/stores/language';
import id from '@/i18n/id.json';
import en from '@/i18n/en.json';

const translations = { id, en } as const;

export function useTranslation() {
  const lang = useLanguageStore((s) => s.lang);
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations[lang];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) return key;
    }
    return result;
  };
  return { t, lang };
}
