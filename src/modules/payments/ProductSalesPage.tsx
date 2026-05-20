import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useProducts, useProductSales, useProductSaleMutation } from "@/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, formatDate } from "@/utils";
import { generateSaleReceipt, previewPdf } from "@/utils/pdf";
import { Button, Input, NumericInput } from "@/components/ui";
import { PrintPreview } from "@/components/PrintPreview";
import { Plus, Minus, Trash2, ShoppingCart, Coins, X, Printer, ShoppingBag, Calendar } from "lucide-react";
import type { Product, ProductSaleItem, PaymentMethod } from "@/types";

type Preset = '7d' | '30d' | 'month' | 'custom';
function getPresetDates(p: Preset) {
  const now = new Date(); const end = now.toISOString().split('T')[0];
  if (p === '7d') { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: s.toISOString().split('T')[0], end }; }
  if (p === '30d') { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: s.toISOString().split('T')[0], end }; }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end };
}
function initials(name: string) { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
const METHOD_COLOR: Record<string, string> = { cash: 'bg-green-100 text-green-700', transfer: 'bg-blue-100 text-blue-700', qris: 'bg-purple-100 text-purple-700' };

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}


export default function ProductSalesPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(today);
  const handlePreset = (p: Preset) => { setPreset(p); if (p !== 'custom') { const d = getPresetDates(p); setStartDate(d.start); setEndDate(d.end); } };
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

  const totalSales = sales.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('payments.sales_title')}</h1>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('payments.add_sale')}</span>
        </Button>
      </div>

      {/* Hero */}
      <div className="bg-zen-brand rounded-3xl p-6 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">Total Penjualan</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalSales)}</p>
        <p className="text-xs text-white/50 mt-2">{sales.length} transaksi</p>
      </div>

      {/* Date presets */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['7d', '30d', 'month', 'custom'] as Preset[]).map(p => (
            <button key={p} onClick={() => handlePreset(p)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all ${preset === p ? 'bg-zen-brand text-white shadow-sm' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : p === 'month' ? 'Bulan Ini' : 'Custom'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
            </div>
            <span className="text-zen-ink/30">—</span>
            <div className="flex-1 relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20" />
            </div>
          </div>
        )}
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
            <ShoppingBag size={32} className="mb-3" />
            <p className="text-sm">{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="divide-y divide-zen-ink/5">
            {sales.map(row => (
              <div key={row.transaction_id} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(row.customer_name || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{row.customer_name || '—'}</p>
                  <p className="text-xs text-zen-ink/40 truncate">
                    {row.items.slice(0, 2).map((i: ProductSaleItem) => `${i.product_name} x${i.quantity}`).join(', ')}
                    {row.items.length > 2 && ` +${row.items.length - 2}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline ${METHOD_COLOR[row.payment_method] || 'bg-zen-bg text-zen-ink/50'}`}>
                    {row.payment_method?.toUpperCase()}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(row.total)}</p>
                    {row.discount > 0 && <p className="text-[10px] text-red-400">-{formatCurrency(row.discount)}</p>}
                  </div>
                  <button onClick={async () => { const doc = await generateSaleReceipt(row); setPdfUrl(previewPdf(doc)); }}
                    className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/30 hover:text-zen-brand transition-colors"
                    title="Cetak struk">
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
