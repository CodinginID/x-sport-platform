import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  isToday,
  getStartOfDay,
  getEndOfDay,
} from '@/utils';

describe('date utilities', () => {
  describe('formatCurrency', () => {
    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('Rp 0');
    });

    it('formats negative amounts', () => {
      expect(formatCurrency(-50000)).toBe('Rp -50.000');
    });

    it('formats large amounts', () => {
      expect(formatCurrency(1000000)).toBe('Rp 1.000.000');
    });
  });

  describe('formatDate', () => {
    it('formats date string', () => {
      expect(formatDate('2024-06-15')).toContain('2024');
    });

    it('formats Date object', () => {
      expect(formatDate(new Date('2024-06-15'))).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    it('includes time in output', () => {
      const result = formatDateTime('2024-06-15T10:30:00');
      expect(result).toContain('2024');
      expect(result).toContain('10:30');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    it('returns midnight', () => {
      const start = getStartOfDay(new Date('2024-06-15T15:30:00'));
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it('uses current date when no argument', () => {
      const start = getStartOfDay();
      expect(start.getHours()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('returns end of day', () => {
      const end = getEndOfDay(new Date('2024-06-15T15:30:00'));
      expect(end.getHours()).toBe(23);
    });
  });
});
