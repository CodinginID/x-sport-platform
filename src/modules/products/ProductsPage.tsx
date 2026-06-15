import { useState } from 'react';
import { useProducts, useProductMutation, useSearchPaginate } from '@/hooks';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { formatCurrency } from '@/utils';
import { Button, Modal, Badge, Input, QueryError, NumericInput, SearchBar } from '@/components/ui';
import { ListSkeleton } from '@/components/Skeleton';
import { Pagination } from '@/components/Pagination';
import { Product } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/hooks/useFeature';
import { Plus, Package2, AlertTriangle, Boxes } from 'lucide-react';

type ProductForm = Omit<Product, 'product_id' | 'created_at' | 'updated_at' | 'active_status'>;
const emptyForm: ProductForm = { product_name: '', category: '', stock: 0, unit: '', selling_price: 0, cost_price: 0 };

export default function ProductsPage() {
  const { t } = useTranslation();
  const isPro = useFeature('pro');
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const mutation = useProductMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [stockModal, setStockModal] = useState<{ id: string; name: string } | null>(null);
  const [adjustment, setAdjustment] = useState(0);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Product) => {
    setEditId(p.product_id);
    setForm({ product_name: p.product_name, category: p.category, stock: p.stock, unit: p.unit, selling_price: p.selling_price, cost_price: p.cost_price });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editId) mutation.mutate({ action: 'update', product: { product_id: editId, ...form } });
    else mutation.mutate({ action: 'add', product: { ...form, active_status: true } });
    setModalOpen(false);
  };

  const handleStockAdjust = () => {
    if (!stockModal) return;
    const doAdjust = () => {
      mutation.mutate({ action: 'adjust_stock', product: { product_id: stockModal.id }, adjustment });
      setStockModal(null);
      setAdjustment(0);
    };
    if (adjustment < 0) {
      useConfirmStore.getState().show({
        title: 'Kurangi Stok?',
        message: `Stok "${stockModal.name}" akan dikurangi ${Math.abs(adjustment)} unit.`,
        variant: 'warning',
        onConfirm: doAdjust,
      });
    } else {
      doAdjust();
    }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const [catFilter, setCatFilter] = useState('');
  const catFiltered = catFilter ? products.filter(p => p.category === catFilter) : products;
  const lowStockProducts = products.filter(p => p.stock < 5);
  const lowStockCount = lowStockProducts.length;
  // Pro insight — nilai inventori = Σ stock × harga jual (dari products yang sudah di-fetch).
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.selling_price, 0);

  const { query, setQuery, pageItems, page, setPage, totalPages, totalFiltered } = useSearchPaginate(
    catFiltered,
    (p, q) => p.product_name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('products.title')}</h1>
          {lowStockCount > 0 && (
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500 mt-0.5 flex items-center gap-1">
              <AlertTriangle size={11} /> {lowStockCount} stok hampir habis
            </p>
          )}
        </div>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('products.add')}</span>
        </Button>
      </div>

      {/* Pro: insight inventori */}
      {isPro && products.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 flex items-center gap-1"><Boxes size={11} /> Nilai Inventori</p>
              <p className="text-lg font-bold mt-1 tracking-tight">{formatCurrency(inventoryValue)}</p>
            </div>
            <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 flex items-center gap-1"><AlertTriangle size={11} /> Stok Menipis</p>
              <p className="text-lg font-bold mt-1 tracking-tight">{lowStockCount} produk</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="bg-amber-50 rounded-3xl p-4 border border-amber-100">
              <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600 mb-2">Perlu Restock</p>
              <div className="flex flex-wrap gap-1.5">
                {lowStockProducts.slice(0, 8).map(p => (
                  <span key={p.product_id} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    {p.product_name} · {p.stock} {p.unit}
                  </span>
                ))}
                {lowStockCount > 8 && <span className="text-[11px] font-bold px-2.5 py-1 text-amber-600/70">+{lowStockCount - 8} lainnya</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <SearchBar value={query} onChange={setQuery} placeholder="Cari produk..." />

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCatFilter('')}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${!catFilter ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
            {t('common.all')}
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${catFilter === cat ? 'bg-zen-brand text-white' : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-ink'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? <ListSkeleton rows={5} /> : isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <Package2 size={32} className="mb-3" />
              <p className="text-sm">Belum ada produk</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {pageItems.map(p => (
                <div key={p.product_id} className="flex items-center gap-3 px-5 py-4 hover:bg-zen-bg transition-colors">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${p.stock < 5 ? 'bg-amber-50 text-amber-400' : 'bg-zen-brand/10 text-zen-brand'}`}>
                    <Package2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold truncate">{p.product_name}</p>
                      {p.stock < 5 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                          Stok {p.stock}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zen-ink/40">{p.category || '—'} · {p.stock} {p.unit}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-bold">{formatCurrency(p.selling_price)}</p>
                    <p className="text-[10px] text-zen-ink/30">HPP {formatCurrency(p.cost_price)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(p)}
                      className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-brand transition-colors text-xs font-bold"
                      title={t('common.edit')}>
                      ✏
                    </button>
                    <button onClick={() => { setStockModal({ id: p.product_id, name: p.product_name }); setAdjustment(0); }}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-zen-bg hover:bg-zen-brand/10 text-zen-ink/50 hover:text-zen-brand transition-colors"
                      title={t('products.adjust_stock')}>
                      Stok
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={totalFiltered} onPageChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `${t('common.edit')} ${t('products.title')}` : t('products.add')}>
        <div className="space-y-3">
          <Input label={t('products.name')} value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
          <Input label={t('products.category')} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('products.stock')} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
            <Input label={t('products.unit')} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
          <NumericInput label={t('products.selling_price')} value={form.selling_price} onChange={v => setForm({ ...form, selling_price: v })} />
          <NumericInput label={t('products.cost_price')} value={form.cost_price} onChange={v => setForm({ ...form, cost_price: v })} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit}>{editId ? t('common.save') : t('common.add')}</Button>
          </div>
        </div>
      </Modal>

      {/* Stock adjust modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`${t('products.adjust_stock')} — ${stockModal?.name ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-zen-ink/50">Masukkan angka positif untuk tambah stok, negatif untuk kurangi.</p>
          <Input label={t('products.adjustment')} type="number" value={adjustment} onChange={e => setAdjustment(+e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setStockModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleStockAdjust}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
