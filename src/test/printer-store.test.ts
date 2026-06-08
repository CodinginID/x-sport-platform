import { describe, it, expect, beforeEach } from 'vitest';
import { usePrinterStore } from '@/stores/printer';

describe('usePrinterStore', () => {
  beforeEach(() => {
    usePrinterStore.setState({
      deviceId: undefined, deviceName: undefined,
      paperSize: '58', autoPrint: true, status: 'disconnected',
    });
  });

  it('has sane defaults', () => {
    const s = usePrinterStore.getState();
    expect(s.paperSize).toBe('58');
    expect(s.autoPrint).toBe(true);
    expect(s.status).toBe('disconnected');
  });

  it('setPaperSize updates paper size', () => {
    usePrinterStore.getState().setPaperSize('80');
    expect(usePrinterStore.getState().paperSize).toBe('80');
  });

  it('setAutoPrint toggles auto print', () => {
    usePrinterStore.getState().setAutoPrint(false);
    expect(usePrinterStore.getState().autoPrint).toBe(false);
  });

  it('setDevice and forgetDevice manage saved device', () => {
    usePrinterStore.getState().setDevice('id-1', 'Panda-58');
    expect(usePrinterStore.getState().deviceId).toBe('id-1');
    expect(usePrinterStore.getState().deviceName).toBe('Panda-58');
    usePrinterStore.getState().forgetDevice();
    expect(usePrinterStore.getState().deviceId).toBeUndefined();
    expect(usePrinterStore.getState().status).toBe('disconnected');
  });

  it('setStatus updates connection status', () => {
    usePrinterStore.getState().setStatus('connected');
    expect(usePrinterStore.getState().status).toBe('connected');
  });
});
