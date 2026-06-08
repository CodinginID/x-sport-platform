import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importWithReload } from '@/utils/lazyWithReload';

const KEY = 'xsport-chunk-reload';

describe('importWithReload', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { reload } });
  });

  it('returns the module and clears the guard on success', async () => {
    sessionStorage.setItem(KEY, '1');
    const mod = await importWithReload(() => Promise.resolve({ default: 'X' }));
    expect(mod).toEqual({ default: 'X' });
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once on the first chunk-load failure', async () => {
    // Returned promise intentionally never resolves; just flush microtasks.
    void importWithReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(KEY)).toBe('1');
  });

  it('rethrows on a second consecutive failure (no reload loop)', async () => {
    sessionStorage.setItem(KEY, '1');
    await expect(importWithReload(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });
});
