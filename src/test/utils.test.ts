import { describe, it, expect } from 'vitest';
import { formatCurrency, hashPassword, verifyPassword, cn, generateId } from '@/utils';

describe('utils', () => {
  it('formatCurrency formats IDR correctly', () => {
    expect(formatCurrency(100000)).toContain('100');
  });

  it('hashPassword and verifyPassword work', async () => {
    const hash = await hashPassword('test123');
    expect(await verifyPassword('test123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('cn joins class names', () => {
    expect(cn('a', 'b', false, undefined)).toBe('a b');
  });

  it('generateId returns UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
