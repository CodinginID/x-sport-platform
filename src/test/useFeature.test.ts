import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeature } from '@/hooks/useFeature';
import { useAuthStore } from '@/stores/auth';

function setAuth(p: Record<string, unknown>) { useAuthStore.setState(p as never); }
const future = '2999-01-01T00:00:00Z';
const past = '2000-01-01T00:00:00Z';

describe('useFeature', () => {
  beforeEach(() => setAuth({ user: { role: 'owner' }, licenseInfo: null }));

  it('false bila tidak ada licenseInfo', () => {
    expect(renderHook(() => useFeature('pro')).result.current).toBe(false);
  });
  it('false bila locked', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: {} } });
    expect(renderHook(() => useFeature('pro')).result.current).toBe(false);
  });
  it('true bila active', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { pro: { status: 'active' } } } });
    expect(renderHook(() => useFeature('pro')).result.current).toBe(true);
  });
  it('true bila trial berjalan', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { pro: { status: 'trial', trial_ends_at: future } } } });
    expect(renderHook(() => useFeature('pro')).result.current).toBe(true);
  });
  it('false bila trial habis', () => {
    setAuth({ user: { role: 'owner' }, licenseInfo: { features: { pro: { status: 'trial', trial_ends_at: past } } } });
    expect(renderHook(() => useFeature('pro')).result.current).toBe(false);
  });
  it('superadmin selalu true', () => {
    setAuth({ user: { role: 'superadmin' }, licenseInfo: null });
    expect(renderHook(() => useFeature('pro')).result.current).toBe(true);
  });
});
