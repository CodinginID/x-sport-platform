import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import { formatDate } from '@/utils';
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
    if (!bt.isSupported()) return false;
    try {
      if (!(await ensureConnected())) return false;
      await bt.print(bytes);
      usePrinterStore.getState().setStatus('connected');
      addToast('Struk tercetak', 'success');
      return true;
    } catch {
      usePrinterStore.getState().setStatus('disconnected');
      return false;
    }
  }, [addToast]);

  /** Cetak struk penjualan. Mengembalikan PDF blob-url bila perlu fallback (atau ''). */
  const printSale = useCallback(async (sale: ProductSale): Promise<string> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const data: SaleReceiptData = {
      studioName: studio.name,
      studioAddress: studio.address,
      transactionId: sale.transaction_id,
      date: formatDate(sale.transaction_date),
      customerName: sale.customer_name ?? '',
      items: sale.items.map((i) => ({ name: i.product_name, qty: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal })),
      total: sale.total,
    };
    if (await printBytes(buildSaleReceipt(data, paperSize))) return '';
    // Fallback: PDF preview (perilaku lama)
    const doc = await generateSaleReceipt({
      transaction_id: sale.transaction_id,
      transaction_date: sale.transaction_date,
      customer_name: sale.customer_name ?? '',
      items: sale.items,
      total: sale.total,
    });
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
