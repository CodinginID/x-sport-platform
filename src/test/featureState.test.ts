import { describe, it, expect } from 'vitest';
import { featureState } from '@/lib/featureState';

const NOW = '2026-06-14T00:00:00Z';

describe('featureState', () => {
  it('locked bila key tidak ada', () => {
    expect(featureState({}, 'premium_booking', NOW).state).toBe('locked');
  });
  it('active bila status active', () => {
    expect(featureState({ premium_booking: { status: 'active' } }, 'premium_booking', NOW).state).toBe('active');
  });
  it('trial bila status trial & belum lewat', () => {
    const r = featureState({ premium_booking: { status: 'trial', trial_ends_at: '2026-06-16T00:00:00Z' } }, 'premium_booking', NOW);
    expect(r.state).toBe('trial');
    expect(r.trialDaysLeft).toBe(2);
  });
  it('trial_expired bila sudah lewat', () => {
    expect(featureState({ premium_booking: { status: 'trial', trial_ends_at: '2026-06-13T00:00:00Z' } }, 'premium_booking', NOW).state).toBe('trial_expired');
  });
});
