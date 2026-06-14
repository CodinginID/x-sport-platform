import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeature } from '@/hooks/useFeature';
import { useAuthStore } from '@/stores/auth';

function setAuth(partial: Record<string, unknown>) {
  useAuthStore.setState(partial as never);
}

describe('useFeature', () => {
  beforeEach(() => {
    setAuth({ user: { role: 'owner' }, licenseInfo: null });
  });

  it('false bila tidak ada licenseInfo', () => {
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(false);
  });

  it('false bila fitur tidak ada di features', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: [] } });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(false);
  });

  it('true bila fitur ada di features', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: ['premium_booking'] } });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(true);
  });

  it('superadmin selalu true (preview)', () => {
    setAuth({ user: { role: 'superadmin' }, licenseInfo: null });
    const { result } = renderHook(() => useFeature('premium_booking'));
    expect(result.current).toBe(true);
  });
});
