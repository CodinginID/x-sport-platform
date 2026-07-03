import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio';
import { usePrinterStore } from '@/stores/printer';
import { useAuthStore } from '@/stores/auth';
import { formatDate, formatDateTime } from '@/utils';
import { buildSaleReceipt, buildPaymentReceipt, buildPayoutSlip, type SaleReceiptData, type PaymentReceiptData } from '@/services/escpos';
import * as bt from '@/services/btPrinter';
import { generateSaleReceipt, generatePaymentReceipt, generatePayoutSlip, previewPdf } from '@/utils/pdf';
import type { CoachPayout, ProductSale } from '@/types';

/** Hasil cetak: `printed` = berhasil via printer Bluetooth; `fallbackUrl` = PDF preview bila tidak. */
export interface PrintResult {
  printed: boolean;
  fallbackUrl: string;
}

/** Pastikan printer tersambung; coba reconnect bila ada device tersimpan. */
async function ensureConnected(): Promise<boolean> {
  if (bt.isConnected()) return true;
  const { deviceId, deviceName, setStatus } = usePrinterStore.getState();
  if (!deviceId) return false;
  setStatus('connecting');
  const result = await bt.reconnect(deviceId, deviceName);
  setStatus(result === 'connected' ? 'connected' : 'disconnected');
  return result === 'connected';
}

export function usePrintReceipt() {
  // Tidak menampilkan toast sendiri — pemanggil yang memutuskan satu toast umum,
  // agar aksi "simpan & cetak" tidak memunculkan banyak toast sekaligus.
  const printBytes = useCallback(async (bytes: Uint8Array): Promise<boolean> => {
    if (!bt.isSupported()) return false;
    if (!(await ensureConnected())) return false;
    try {
      await bt.print(bytes);
      usePrinterStore.getState().setStatus('connected');
      return true;
    } catch (e) {
      usePrinterStore.getState().setStatus('disconnected');
      console.error('[print] gagal mengirim ke printer:', e);
      return false;
    }
  }, []);

  const printSale = useCallback(async (sale: ProductSale): Promise<PrintResult> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const cashier = useAuthStore.getState().user?.full_name ?? '';
    const data: SaleReceiptData = {
      studioName: studio.name,
      studioAddress: studio.address,
      transactionId: sale.transaction_id,
      date: formatDateTime(sale.created_at || sale.transaction_date),
      cashier,
      customerName: sale.customer_name ?? '',
      items: sale.items.map((i) => ({ name: i.product_name, qty: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      cashReceived: sale.cash_received,
      change: sale.change,
      notes: sale.notes,
    };
    if (await printBytes(buildSaleReceipt(data, paperSize))) return { printed: true, fallbackUrl: '' };
    // Fallback: PDF preview — same details as the printed receipt. Guarded so a failed
    // dynamic import (offline → "Failed to fetch") doesn't crash the save flow.
    try {
      const doc = await generateSaleReceipt({ ...sale, cashier });
      return { printed: false, fallbackUrl: previewPdf(doc) };
    } catch (e) {
      console.error('[print] gagal membuat PDF struk:', e);
      return { printed: false, fallbackUrl: '' };
    }
  }, [printBytes]);

  /**
   * Cetak struk pembayaran member. Nama/alamat studio diambil dari store di sini
   * (single source of truth) — pemanggil cukup memberi data pembayaran + `raw`
   * (objek untuk generator PDF fallback).
   */
  const printPayment = useCallback(async (
    p: Omit<PaymentReceiptData, 'studioName' | 'studioAddress'> & { raw: Parameters<typeof generatePaymentReceipt>[0] },
  ): Promise<PrintResult> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const data: PaymentReceiptData = { ...p, studioName: studio.name, studioAddress: studio.address };
    if (await printBytes(buildPaymentReceipt(data, paperSize))) return { printed: true, fallbackUrl: '' };
    try {
      const doc = await generatePaymentReceipt(p.raw);
      return { printed: false, fallbackUrl: previewPdf(doc) };
    } catch (e) {
      console.error('[print] gagal membuat PDF struk:', e);
      return { printed: false, fallbackUrl: '' };
    }
  }, [printBytes]);

  /** Cetak slip gaji/komisi coach; `items` = breakdown per kelas dari pemanggil. */
  const printPayout = useCallback(async (
    payout: CoachPayout,
    items: { label: string; count: number; amount: number }[],
  ): Promise<PrintResult> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const bytes = buildPayoutSlip({
      studioName: studio.name,
      studioAddress: studio.address,
      payoutId: payout.payout_id,
      coachName: payout.coach_name,
      periodStart: formatDate(payout.period_start),
      periodEnd: formatDate(payout.period_end),
      paidAt: formatDate(payout.paid_at),
      items,
      sessionCount: payout.session_count,
      total: payout.total_amount,
      notes: payout.notes || undefined,
    }, paperSize);
    if (await printBytes(bytes)) return { printed: true, fallbackUrl: '' };
    try {
      const doc = await generatePayoutSlip({ ...payout, items, notes: payout.notes || undefined });
      return { printed: false, fallbackUrl: previewPdf(doc) };
    } catch (e) {
      console.error('[print] gagal membuat PDF slip:', e);
      return { printed: false, fallbackUrl: '' };
    }
  }, [printBytes]);

  return { printSale, printPayment, printPayout };
}
