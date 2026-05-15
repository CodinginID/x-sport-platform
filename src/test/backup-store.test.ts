import { describe, it, expect, beforeEach } from 'vitest';
import { useBackupStore, createNewCredentials } from '@/stores/backup';

describe('useBackupStore', () => {
  beforeEach(() => {
    useBackupStore.setState({
      studioId: null,
      pin: null,
      lastBackupAt: null,
      autoBackupEnabled: true,
      isBackingUp: false,
    });
  });

  it('has default state', () => {
    const state = useBackupStore.getState();
    expect(state.studioId).toBeNull();
    expect(state.pin).toBeNull();
    expect(state.lastBackupAt).toBeNull();
    expect(state.autoBackupEnabled).toBe(true);
    expect(state.isBackingUp).toBe(false);
  });

  it('sets credentials', () => {
    useBackupStore.getState().setCredentials('XSP-ABC12', '1234');
    const state = useBackupStore.getState();
    expect(state.studioId).toBe('XSP-ABC12');
    expect(state.pin).toBe('1234');
  });

  it('sets last backup timestamp', () => {
    useBackupStore.getState().setLastBackup('2024-06-15T10:00:00Z');
    expect(useBackupStore.getState().lastBackupAt).toBe('2024-06-15T10:00:00Z');
  });

  it('toggles auto backup', () => {
    useBackupStore.getState().setAutoBackup(false);
    expect(useBackupStore.getState().autoBackupEnabled).toBe(false);
    useBackupStore.getState().setAutoBackup(true);
    expect(useBackupStore.getState().autoBackupEnabled).toBe(true);
  });

  it('sets backing up status', () => {
    useBackupStore.getState().setIsBackingUp(true);
    expect(useBackupStore.getState().isBackingUp).toBe(true);
    useBackupStore.getState().setIsBackingUp(false);
    expect(useBackupStore.getState().isBackingUp).toBe(false);
  });
});

describe('createNewCredentials', () => {
  it('generates studio ID with XSP- prefix', () => {
    const creds = createNewCredentials();
    expect(creds.studioId).toMatch(/^XSP-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('generates 4-digit pin', () => {
    const creds = createNewCredentials();
    expect(creds.pin).toMatch(/^\d{4}$/);
  });

  it('generates unique credentials each time', () => {
    const creds1 = createNewCredentials();
    const creds2 = createNewCredentials();
    expect(creds1.studioId).not.toBe(creds2.studioId);
  });
});
