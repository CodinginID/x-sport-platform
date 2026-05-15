import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguageStore } from '@/stores/language';

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState({ lang: 'id' });
  });

  it('defaults to Indonesian', () => {
    expect(useLanguageStore.getState().lang).toBe('id');
  });

  it('switches to English', () => {
    useLanguageStore.getState().setLang('en');
    expect(useLanguageStore.getState().lang).toBe('en');
  });

  it('switches back to Indonesian', () => {
    useLanguageStore.getState().setLang('en');
    useLanguageStore.getState().setLang('id');
    expect(useLanguageStore.getState().lang).toBe('id');
  });
});
