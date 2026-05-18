import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useProducts, useProductSales, useProductSaleMutation } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { generateSaleReceipt, previewPdf } from "@/utils/pdf";
import { Button, Input, DataTable, DateRangeFilter, Badge, ActionButtons, NumericInput } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";
import { Plus, Minus, Trash2, ShoppingCart, Coins, X } from "lucide-react";
import type { Product, ProductSaleItem, PaymentMethod } from "@/types";

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const methodBadge: Record<PaymentMethod, { label: string; variant: 'success' | 'info' | 'warning' }> = {
  cash: { label: 'Tunai', variant: 'success' },
  transfer: { label: 'Transfer', variant: 'info' },
  qris: { label: 'QRIS', variant: 'warning' },
};

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [notes, setNotes] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products.filter(p => p.active_status);
    return products.filter(p => p.active_status && p.category === categoryFilter);
  }, [products, categoryFilter]);

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const change = paymentMethod === "cash" ? Math.max(0, cashReceived - total) : 0;
  const isCashValid = paymentMethod !== "cash" || cashReceived >= total;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.product_id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        );
      }
      return [...prev, { product_id: product.product_id, product_name: product.product_name, quantity: 1, unit_price: product.selling_price }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product_id !== productId) return item;
        const product = products.find(p => p.product_id === productId);
        const maxStock = product?.stock ?? 99;
        const next = item.quantity + delta;
        if (next <= 0) return item;
        return { ...item, quantity: Math.min(next, maxStock) };
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleSubmit = () => {
    const saleItems: ProductSaleItem[] = cart.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }));
    mutation.mutate({
      transaction_date: today,
      customer_name: customerName,
      items: saleItems,
      subtotal,
      discount,
      total,
      payment_method: paymentMethod,
      cash_received: paymentMethod === "cash" ? cashReceived : total,
      change,
      notes,
    }, {
      onSuccess: () => {
        setModalOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setCustomerName("");
    setCart([]);
    setDiscount(0);
    setPaymentMethod("cash");
    setCashReceived(0);
    setNotes("");
    setCategoryFilter("");
  };

  const columns = [
    { key: "transaction_date", label: t('bookings.date'), render: (row: any) => (
      <span className="text-xs whitespace-nowrap">{formatDate(row.transaction_date)}</span>
    )},
    { key: "customer_name", label: t('payments.customer'), render: (row: any) => (
      <span className="font-semibold text-sm">{row.customer_name}</span>
    )},
    { key: "items", label: "Item", render: (row: any) => (
      <div className="space-y-0.5">
        {row.items.slice(0, 2).map((i: ProductSaleItem, idx: number) => (
          <div key={idx} className="text-xs text-zen-ink/70 whitespace-nowrap">
            {i.product_name} <span className="font-bold">x{i.quantity}</span>
          </div>
        ))}
        {row.items.length > 2 && (
          <div className="text-[10px] text-zen-ink/40">+{row.items.length - 2} lainnya</div>
        )}
      </div>
    )},
    { key: "payment_method", label: t('payments.method'), render: (row: any) => {
      const m = methodBadge[row.payment_method as PaymentMethod] || methodBadge.cash;
      return <Badge variant={m.variant}>{m.label}</Badge>;
    }},
    { key: "total", label: t('payments.total'), render: (row: any) => (
      <div className="text-right">
        <div className="font-bold text-sm">{formatCurrency(row.total)}</div>
        {row.discount > 0 && (
          <div className="text-[9px] text-red-400">-{formatCurrency(row.discount)}</div>
        )}
      </div>
    )},
    { key: "actions", label: "", render: (row: any) => (
      <ActionButtons actions={[
        { action: 'print', onClick: async () => { const doc = await generateSaleReceipt(row); setPdfUrl(previewPdf(doc)); } },
      ]} />
    )},
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('payments.sales_title')}</h1>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>{t('payments.add_sale')}</Button>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />

      <DataTable columns={columns} data={sales} emptyMessage={t('common.no_data')} />

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zen-ink/5">
            <h2 className="text-lg font-bold">{t('payments.add_sale')}</h2>
            <button onClick={() => setModalOpen(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zen-ink/40 hover:text-zen-ink hover:bg-zen-bg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-4 p-4 pb-40 md:pb-4">
              {/* Left: Product Grid */}
              <div className="flex-1 min-w-0 space-y-3">
                <Input label={t('payments.customer')} value={customerName}
                  onChange={e => setCustomerName(e.target.value)} placeholder="Nama pelanggan" />

                {/* Category Filter */}
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setCategoryFilter("")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${!categoryFilter ? 'bg-zen-brand text-white' : 'bg-zen-bg text-zen-ink/50 hover:bg-zen-brand/10'}`}>
                    {t('common.all')}
                  </button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${categoryFilter === cat ? 'bg-zen-brand text-white' : 'bg-zen-bg text-zen-ink/50 hover:bg-zen-brand/10'}`}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredProducts.map(product => (
                    <button key={product.product_id} onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-zen-bg hover:bg-zen-brand/5 border border-zen-ink/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                      <span className="font-bold text-sm text-center leading-tight">{product.product_name}</span>
                      <span className="text-xs font-bold text-zen-brand mt-1">{formatCurrency(product.selling_price)}</span>
                      <span className="text-[9px] text-zen-ink/40 mt-0.5">
                        {t('payments.stock_left')}: {product.stock} {product.unit}
                      </span>
                      {product.stock <= 0 && (
                        <span className="absolute top-1 right-1 text-[8px] font-bold text-red-400 uppercase">habis</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Cart & Payment */}
              <div className="w-full md:w-80 shrink-0 space-y-3">
                {/* Cart */}
                <div className="rounded-2xl border border-zen-ink/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart size={16} className="text-zen-brand" />
                    <span className="text-xs uppercase tracking-widest font-bold">Cart</span>
                    <span className="text-xs text-zen-ink/40">({cart.length} item)</span>
                  </div>
                  {cart.length === 0 ? (
                    <p className="text-xs text-zen-ink/30 text-center py-4">{t('payments.no_items')}</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.product_id} className="flex items-center justify-between gap-2 py-1.5 border-b border-zen-brand/5 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{item.product_name}</div>
                            <div className="text-[10px] text-zen-ink/40">{formatCurrency(item.unit_price)}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.product_id, -1)}
                              className="w-7 h-7 rounded-full bg-zen-bg flex items-center justify-center hover:bg-zen-brand/10 transition-colors">
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQty(item.product_id, 1)}
                              className="w-7 h-7 rounded-full bg-zen-bg flex items-center justify-center hover:bg-zen-brand/10 transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-xs font-bold w-16 text-right">{formatCurrency(item.unit_price * item.quantity)}</div>
                          <button onClick={() => removeFromCart(item.product_id)} className="text-red-300 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Section */}
                <NumericInput label={t('payments.discount')} min={0} max={subtotal} value={discount}
                  onChange={v => setDiscount(v)} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold opacity-60">{t('payments.method')}</label>
                  <div className="flex gap-2">
                    {(['cash', 'transfer', 'qris'] as PaymentMethod[]).map(method => (
                      <button key={method} onClick={() => setPaymentMethod(method)}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${paymentMethod === method ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50 hover:bg-zen-brand/10'}`}>
                        {t(`payments.method_${method}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "cash" && (
                  <div className="space-y-1.5">
                    <NumericInput label={t('payments.cash_received')} min={0} value={cashReceived}
                      onChange={v => setCashReceived(v)} />
                    <button onClick={() => setCashReceived(total)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zen-brand hover:text-zen-ink transition-colors">
                      <Coins size={12} /> {t('payments.quick_cash')} ({formatCurrency(total)})
                    </button>
                  </div>
                )}

                {paymentMethod === "cash" && cashReceived > 0 && (
                  <div className="flex justify-between items-center py-2 px-4 rounded-2xl bg-zen-brand/5">
                    <span className="text-xs uppercase tracking-widest font-bold text-zen-ink/60">{t('payments.change')}</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(change)}</span>
                  </div>
                )}

                <Input label={t('payments.notes_optional')} value={notes} onChange={e => setNotes(e.target.value)} />

                {/* Totals - visible on desktop */}
                <div className="hidden md:block space-y-1 pt-3 border-t border-zen-brand/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-zen-ink/40">{t('payments.subtotal')}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zen-ink/40">{t('payments.discount')}</span>
                      <span className="text-red-500">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1 border-t border-zen-brand/10">
                    <span>{t('payments.total')}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <Button onClick={handleSubmit} className="w-full mt-3"
                    disabled={!customerName.trim() || cart.length === 0 || !isCashValid || mutation.isPending}>
                    {mutation.isPending ? t('payments.saving') : t('payments.save_sale')}
                  </Button>
                  {paymentMethod === "cash" && cashReceived > 0 && !isCashValid && (
                    <p className="text-xs text-red-500 text-center">{t('payments.insufficient_cash')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky bottom bar - mobile only */}
          <div className="md:hidden shrink-0 border-t border-zen-ink/10 bg-white px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">{t('payments.total')}</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
            {paymentMethod === "cash" && cashReceived > 0 && !isCashValid && (
              <p className="text-xs text-red-500">{t('payments.insufficient_cash')}</p>
            )}
            <Button onClick={handleSubmit} className="w-full" size="lg"
              disabled={!customerName.trim() || cart.length === 0 || !isCashValid || mutation.isPending}>
              {mutation.isPending ? t('payments.saving') : t('payments.save_sale')}
            </Button>
          </div>
        </div>,
        document.body
      )}

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl("")} pdfUrl={pdfUrl} filename="struk-penjualan.pdf" />
    </div>
  );
}
