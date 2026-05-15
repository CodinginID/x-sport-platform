import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToastStore } from '@/stores/toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('adds a toast', () => {
    useToastStore.getState().addToast('Hello', 'success');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
    expect(useToastStore.getState().toasts[0].variant).toBe('success');
  });

  it('removes a toast', () => {
    useToastStore.getState().addToast('Test', 'info');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('auto-removes toast after 3s', () => {
    vi.useFakeTimers();
    useToastStore.getState().addToast('Auto', 'warning');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});
