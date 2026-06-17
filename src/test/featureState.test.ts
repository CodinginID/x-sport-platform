import { describe, it, expect } from 'vitest';
import { featureState } from '@/lib/featureState';

const NOW = '2026-06-14T00:00:00Z';

describe('featureState', () => {
  it('locked bila key tidak ada', () => {
    expect(featureState({}, 'pro', NOW).state).toBe('locked');
  });
  it('active bila status active', () => {
    expect(featureState({ pro: { status: 'active' } }, 'pro', NOW).state).toBe('active');
  });
  it('trial bila status trial & belum lewat', () => {
    const r = featureState({ pro: { status: 'trial', trial_ends_at: '2026-06-16T00:00:00Z' } }, 'pro', NOW);
    expect(r.state).toBe('trial');
    expect(r.trialDaysLeft).toBe(2);
  });
  it('trial_expired bila sudah lewat', () => {
    expect(featureState({ pro: { status: 'trial', trial_ends_at: '2026-06-13T00:00:00Z' } }, 'pro', NOW).state).toBe('trial_expired');
  });
  it('sudah pernah trial (dicabut) → trial_expired, bukan locked (harus bayar)', () => {
    expect(featureState({ pro: { status: 'trial', trial_ends_at: '2000-01-01T00:00:00Z', trial_used: true } }, 'pro', NOW).state).toBe('trial_expired');
  });
});
