import { useState } from "react";
import { useProducts, useProductSales, useProductSaleMutation } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { generateSaleReceipt, previewPdf } from "@/utils/pdf";
import { Button, Modal, Input, Select, DataTable, DateRangeFilter, Card } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";
import { Printer } from "lucide-react";
import type { Product, ProductSaleItem } from "@/types";

interface SaleItemForm {
  product_id: string;
  quantity: number;
}

export default function ProductSalesPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { data: sales = [] } = useProductSales({ startDate, endDate });
  const { data: products = [] } = useProducts();
  const mutation = useProductSaleMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<SaleItemForm[]>([{ product_id: "", quantity: 1 }]);
  const [pdfUrl, setPdfUrl] = useState("");

  const getProduct = (id: string): Product | undefined => products.find(p => p.product_id === id);

  const calcSubtotal = (item: SaleItemForm) => {
    const p = getProduct(item.product_id);
    return p ? p.selling_price * item.quantity : 0;
  };

  const total = items.reduce((sum, item) => sum + calcSubtotal(item), 0);

  const productOptions = [{ value: "", label: t('payments.select_product') }, ...products.map(p => ({ value: p.product_id, label: p.product_name }))];

  const addItem = () => setItems([...items, { product_id: "", quantity: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof SaleItemForm, value: string | number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = () => {
    const saleItems: ProductSaleItem[] = items.filter(i => i.product_id).map(i => {
      const p = getProduct(i.product_id)!;
      return { product_id: p.product_id, product_name: p.product_name, quantity: i.quantity, unit_price: p.selling_price, subtotal: p.selling_price * i.quantity };
    });
    mutation.mutate({ transaction_date: today, customer_name: customerName, items: saleItems, total });
    setModalOpen(false);
    setCustomerName("");
    setItems([{ product_id: "", quantity: 1 }]);
  };

  const columns = [
    { key: "transaction_date", label: t('bookings.date'), render: (row: any) => formatDate(row.transaction_date) },
    { key: "customer_name", label: t('payments.customer') },
    { key: "items", label: "Item", render: (row: any) => row.items.map((i: ProductSaleItem) => `${i.product_name} x${i.quantity}`).join(", ") },
    { key: "total", label: t('payments.total'), render: (row: any) => formatCurrency(row.total) },
    { key: "actions", label: "", render: (row: any) => (
      <Button size="sm" variant="ghost" onClick={async () => {
        const doc = await generateSaleReceipt(row);
        setPdfUrl(previewPdf(doc));
      }}><Printer size={14} /></Button>
    )},
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('payments.sales_title')}</h1>
        <Button onClick={() => setModalOpen(true)}>{t('payments.add_sale')}</Button>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />

      <DataTable columns={columns} data={sales} emptyMessage={t('common.no_data')} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('payments.add_sale')} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label={t('payments.customer')} value={customerName} onChange={e => setCustomerName(e.target.value)} />

          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-end">
              <Select label={t('products.title')} options={productOptions} value={item.product_id} onChange={e => updateItem(i, "product_id", e.target.value)} className="flex-1" />
              <Input label={t('payments.quantity')} type="number" min={1} value={item.quantity} onChange={e => updateItem(i, "quantity", +e.target.value)} className="w-20" />
              <span className="pb-2 text-sm whitespace-nowrap">{formatCurrency(calcSubtotal(item))}</span>
              {items.length > 1 && <Button variant="danger" size="sm" onClick={() => removeItem(i)}>✕</Button>}
            </div>
          ))}

          <Button variant="secondary" size="sm" onClick={addItem}>{t('payments.add_item')}</Button>

          <div className="text-right font-bold text-lg">{t('payments.total')}: {formatCurrency(total)}</div>

          <Button onClick={handleSubmit} className="w-full" disabled={!customerName || items.every(i => !i.product_id)}>
            {t('common.save')}
          </Button>
        </div>
      </Modal>

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-penjualan.pdf" />
    </div>
  );
}
