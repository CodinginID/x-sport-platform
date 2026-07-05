import { formatCurrency, formatDate, formatDateTime } from '@/utils';
import { useStudioStore } from '@/stores/studio';

function studio() {
  const s = useStudioStore.getState();
  return { name: s.name, address: s.address };
}

async function getJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  return { jsPDF, autoTable };
}

function header(doc: any, title: string) {
  const s = studio();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(s.name, 14, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(s.address, 14, 26);
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 38);
  return 42;
}

export async function generatePaymentReceipt(payment: {
  payment_id: string; payment_date: string; member_name: string;
  package_name: string; amount: number; payment_method: string; notes?: string;
}) {
  const { jsPDF } = await getJsPDF();
  const s = studio();
  const doc = new jsPDF({ format: [80, 150], unit: 'mm' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(s.name, 40, 8, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(s.address, 40, 12, { align: 'center' });
  doc.text('--------------------------------', 40, 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('STRUK PEMBAYARAN', 40, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let y = 27;
  const lines = [
    ['No', payment.payment_id.slice(0, 8).toUpperCase()],
    ['Tanggal', formatDate(payment.payment_date)],
    ['Member', payment.member_name],
    ['Paket', payment.package_name],
    ['Metode', payment.payment_method.toUpperCase()],
  ];
  lines.forEach(([k, v]) => { doc.text(k, 5, y); doc.text(v, 75, y, { align: 'right' }); y += 5; });
  doc.text('--------------------------------', 40, y, { align: 'center' }); y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 5, y);
  doc.text(formatCurrency(payment.amount), 75, y, { align: 'right' }); y += 7;
  if (payment.notes) { doc.setFontSize(6); doc.text(`Catatan: ${payment.notes}`, 5, y); y += 5; }
  doc.setFontSize(6);
  doc.text('Terima kasih!', 40, y + 3, { align: 'center' });
  return doc;
}

export async function generateSaleReceipt(sale: {
  transaction_id: string; transaction_date: string; created_at?: string; customer_name: string;
  cashier?: string;
  items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  subtotal?: number; discount?: number; total: number;
  payment_method?: string; cash_received?: number; change?: number; notes?: string;
}) {
  const { jsPDF } = await getJsPDF();
  const s = studio();
  const doc = new jsPDF({ format: [80, 200], unit: 'mm' });
  const DIV = '--------------------------------';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(s.name, 40, 8, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(s.address, 40, 12, { align: 'center' });
  doc.text(DIV, 40, 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('STRUK PENJUALAN', 40, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let y = 27;
  doc.text(`No    : ${sale.transaction_id.slice(0, 8).toUpperCase()}`, 5, y); y += 4;
  doc.text(`Waktu : ${formatDateTime(sale.created_at || sale.transaction_date)}`, 5, y); y += 4;
  doc.text(`Kasir : ${sale.cashier || '-'}`, 5, y); y += 4;
  doc.text(`Plg   : ${sale.customer_name || '-'}`, 5, y); y += 5;
  doc.text(DIV, 40, y, { align: 'center' }); y += 4;
  sale.items.forEach(item => {
    // Wrap long names so they don't overflow the 80mm page edge.
    for (const ln of doc.splitTextToSize(item.product_name, 70) as string[]) { doc.text(ln, 5, y); y += 4; }
    doc.text(`  ${item.quantity} x ${formatCurrency(item.unit_price)}`, 5, y);
    doc.text(formatCurrency(item.subtotal), 75, y, { align: 'right' }); y += 5;
  });
  doc.text(DIV, 40, y, { align: 'center' }); y += 5;
  const line = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 5, y); doc.text(value, 75, y, { align: 'right' }); y += bold ? 5 : 4;
  };
  if (sale.subtotal !== undefined) line('Subtotal', formatCurrency(sale.subtotal));
  if (sale.discount) line('Diskon', `-${formatCurrency(sale.discount)}`);
  doc.setFontSize(9); line('TOTAL', formatCurrency(sale.total), true); doc.setFontSize(7);
  doc.text(DIV, 40, y, { align: 'center' }); y += 4;
  if (sale.payment_method) line('Metode', sale.payment_method.toUpperCase());
  if (sale.payment_method === 'cash') {
    line('Tunai', formatCurrency(sale.cash_received ?? 0));
    line('Kembali', formatCurrency(sale.change ?? 0));
  }
  if (sale.notes) { doc.text(`Catatan: ${sale.notes}`, 5, y); y += 5; }
  y += 2;
  doc.setFontSize(6);
  doc.text('Terima kasih!', 40, y, { align: 'center' });
  return doc;
}

/** Slip gaji coach format A4 — mengikuti format slip client:
 *  header ringkasan + tabel rekap per tanggal & per kelas berdampingan. */
export async function generatePayoutSlip(payout: {
  payout_id: string; coach_name: string; period_start: string; period_end: string;
  paid_at: string;
  perDate: { label: string; count: number; amount: number }[];
  items: { label: string; count: number; amount: number }[];
  session_count: number; total_amount: number; deduction: number; notes?: string;
}) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF();
  let y = header(doc, 'Slip Gaji Coach');
  doc.setFontSize(8);
  doc.text(`No: ${payout.payout_id.slice(0, 8).toUpperCase()}`, 196, 38, { align: 'right' });

  // Blok info + ringkasan (Total Pendapatan - Potongan = Total Akhir)
  y += 2;
  doc.setFontSize(9);
  const info: [string, string, boolean?][] = [
    ['Coach', payout.coach_name],
    ['Periode', `${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}`],
    ['Dibayar', formatDate(payout.paid_at)],
    ['Total Pendapatan', formatCurrency(payout.total_amount)],
    ['Potongan', formatCurrency(payout.deduction)],
    ['Total Akhir', formatCurrency(payout.total_amount - payout.deduction), true],
  ];
  info.forEach(([k, v, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(`${k}`, 14, y);
    doc.text(`: ${v}`, 50, y);
    y += 6;
  });
  y += 2;

  // Dua tabel berdampingan: kiri per tanggal, kanan per kelas/paket.
  const styles = { fontSize: 8, cellPadding: 2 } as const;
  const headStyles = { fillColor: [139, 92, 246] as [number, number, number], textColor: 255 as const, fontStyle: 'bold' as const };
  const footStyles = { fillColor: [248, 250, 252] as [number, number, number], textColor: 20 as const, fontStyle: 'bold' as const };
  autoTable(doc, {
    startY: y,
    head: [['Tanggal', 'Jml Member', 'Komisi']],
    body: payout.perDate.map(d => [d.label, String(d.count), formatCurrency(d.amount)]),
    foot: [['Total', String(payout.session_count), formatCurrency(payout.total_amount)]],
    styles, headStyles, footStyles,
    margin: { left: 14 }, tableWidth: 86,
  });
  autoTable(doc, {
    startY: y,
    head: [['Kelas / Paket', 'Jml Member', 'Komisi']],
    body: payout.items.map(it => [it.label, String(it.count), formatCurrency(it.amount)]),
    foot: [['Total', String(payout.session_count), formatCurrency(payout.total_amount)]],
    styles, headStyles, footStyles,
    margin: { left: 106 }, tableWidth: 90,
  });

  const finalY = Math.max((doc as any).lastAutoTable?.finalY ?? y, y) + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (payout.notes) doc.text(`Catatan: ${payout.notes}`, 14, finalY);
  doc.text(`Dicetak: ${formatDate(new Date().toISOString())}`, 196, finalY, { align: 'right' });
  return doc;
}

export async function generateReport(title: string, columns: string[], rows: string[][], summary?: { label: string; value: string }[]) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF();
  const y = header(doc, title);
  doc.setFontSize(8);
  doc.text(`Dicetak: ${formatDate(new Date().toISOString())}`, 196, 38, { align: 'right' });

  autoTable(doc, {
    startY: y,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  if (summary) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    summary.forEach((s, i) => {
      doc.setFont('helvetica', i === summary.length - 1 ? 'bold' : 'normal');
      doc.text(s.label, 130, finalY + i * 7);
      doc.text(s.value, 196, finalY + i * 7, { align: 'right' });
    });
  }
  return doc;
}

export function previewPdf(doc: any): string {
  return doc.output('bloburl').toString();
}

export function downloadPdf(doc: any, filename: string) {
  doc.save(filename);
}
