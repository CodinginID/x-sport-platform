import { describe, it, expect } from 'vitest';
import { slotInfo } from '@/hooks/useTrainingSessions';

describe('slotInfo', () => {
  it('hitung terisi & penuh dari peserta non-cancelled', () => {
    expect(slotInfo(3, 8)).toEqual({ filled: 3, capacity: 8, isFull: false });
    expect(slotInfo(8, 8)).toEqual({ filled: 8, capacity: 8, isFull: true });
    expect(slotInfo(9, 8)).toEqual({ filled: 9, capacity: 8, isFull: true });
  });
});
