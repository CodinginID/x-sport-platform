import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils';
import { buildSaleReceipt, buildPaymentReceipt, type SaleReceiptData, type PaymentReceiptData } from '@/services/escpos';
import * as bt from '@/services/btPrinter';
import { generateSaleReceipt, generatePaymentReceipt, previewPdf } from '@/utils/pdf';
import type { ProductSale } from '@/types';

/** Pastikan printer tersambung; coba reconnect bila ada device tersimpan. */
async function ensureConnected(): Promise<boolean> {
  if (bt.isConnected()) return true;
  const { deviceId, setStatus } = usePrinterStore.getState();
  if (!deviceId) return false;
  setStatus('connecting');
  const ok = await bt.reconnect(deviceId);
  setStatus(ok ? 'connected' : 'disconnected');
  return ok;
}

export function usePrintReceipt() {
  const addToast = useToastStore((s) => s.addToast);

  const printBytes = useCallback(async (bytes: Uint8Array): Promise<boolean> => {
    if (!bt.isSupported()) {
      addToast('Perangkat/browser ini tidak mendukung cetak Bluetooth — menampilkan PDF.', 'warning');
      return false;
    }
    if (!(await ensureConnected())) {
      addToast('Printer belum terhubung. Hubungkan dulu di Pengaturan → Printer.', 'error');
      return false;
    }
    try {
      await bt.print(bytes);
      usePrinterStore.getState().setStatus('connected');
      addToast('Struk tercetak', 'success');
      return true;
    } catch (e) {
      usePrinterStore.getState().setStatus('disconnected');
      console.error('[print] gagal mengirim ke printer:', e);
      addToast(`Gagal mencetak: ${e instanceof Error ? e.message : 'kesalahan tak dikenal'}`, 'error');
      return false;
    }
  }, [addToast]);

  /** Cetak struk penjualan. Mengembalikan PDF blob-url bila perlu fallback (atau ''). */
  const printSale = useCallback(async (sale: ProductSale): Promise<string> => {
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
    if (await printBytes(buildSaleReceipt(data, paperSize))) return '';
    // Fallback: PDF preview (perilaku lama) — same details as the printed receipt.
    const doc = await generateSaleReceipt({ ...sale, cashier });
    return previewPdf(doc);
  }, [printBytes]);

  /**
   * Cetak struk pembayaran member. Nama/alamat studio diambil dari store di sini
   * (single source of truth) — pemanggil cukup memberi data pembayaran + `raw`
   * (objek untuk generator PDF fallback). Mengembalikan PDF blob-url bila fallback (atau '').
   */
  const printPayment = useCallback(async (
    p: Omit<PaymentReceiptData, 'studioName' | 'studioAddress'> & { raw: Parameters<typeof generatePaymentReceipt>[0] },
  ): Promise<string> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const data: PaymentReceiptData = { ...p, studioName: studio.name, studioAddress: studio.address };
    if (await printBytes(buildPaymentReceipt(data, paperSize))) return '';
    const doc = await generatePaymentReceipt(p.raw);
    return previewPdf(doc);
  }, [printBytes]);

  return { printSale, printPayment };
}
