import { describe, it, expect, beforeAll } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { seedDatabase } from '@/database/seed';

describe('useAuthStore', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('starts unauthenticated', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login with valid credentials', async () => {
    const result = await useAuthStore.getState().login('admin@studio.com', 'admin123', false);
    expect(result).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('owner');
  });

  it('login with username (without @domain)', async () => {
    const result = await useAuthStore.getState().login('admin', 'admin123', false);
    expect(result).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('owner');
  });

  it('login with invalid credentials fails', async () => {
    const result = await useAuthStore.getState().login('admin@studio.com', 'wrong', false);
    expect(result).toBe(false);
  });

  it('logout clears state', () => {
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
