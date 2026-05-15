import { formatCurrency, formatDate } from '@/utils';

const STUDIO_NAME = 'X-Sport Studio';
const STUDIO_ADDRESS = 'Jl. Olahraga No. 1, Jakarta';

async function getJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  return { jsPDF, autoTable };
}

function header(doc: any, title: string) {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(STUDIO_NAME, 14, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(STUDIO_ADDRESS, 14, 26);
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
  const doc = new jsPDF({ format: [80, 150], unit: 'mm' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(STUDIO_NAME, 40, 8, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(STUDIO_ADDRESS, 40, 12, { align: 'center' });
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
  transaction_id: string; transaction_date: string; customer_name: string;
  items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  total: number;
}) {
  const { jsPDF } = await getJsPDF();
  const doc = new jsPDF({ format: [80, 150], unit: 'mm' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(STUDIO_NAME, 40, 8, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(STUDIO_ADDRESS, 40, 12, { align: 'center' });
  doc.text('--------------------------------', 40, 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('STRUK PENJUALAN', 40, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let y = 27;
  doc.text(`No: ${sale.transaction_id.slice(0, 8).toUpperCase()}`, 5, y); y += 4;
  doc.text(`Tgl: ${formatDate(sale.transaction_date)}`, 5, y); y += 4;
  doc.text(`Pelanggan: ${sale.customer_name}`, 5, y); y += 5;
  doc.text('--------------------------------', 40, y, { align: 'center' }); y += 4;
  sale.items.forEach(item => {
    doc.text(item.product_name, 5, y); y += 4;
    doc.text(`  ${item.quantity} x ${formatCurrency(item.unit_price)}`, 5, y);
    doc.text(formatCurrency(item.subtotal), 75, y, { align: 'right' }); y += 5;
  });
  doc.text('--------------------------------', 40, y, { align: 'center' }); y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 5, y);
  doc.text(formatCurrency(sale.total), 75, y, { align: 'right' }); y += 7;
  doc.setFontSize(6);
  doc.text('Terima kasih!', 40, y, { align: 'center' });
  return doc;
}

export async function generateReport(title: string, columns: string[], rows: string[][], summary?: { label: string; value: string }[]) {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF();
  let y = header(doc, title);
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
