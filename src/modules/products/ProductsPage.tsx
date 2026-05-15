import { useState } from 'react';
import { useProducts, useProductMutation } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { formatCurrency } from '@/utils';
import { DataTable, Button, Modal, Badge, Input, QueryError } from '@/components/ui';
import { Product } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

type ProductForm = Omit<Product, 'product_id' | 'created_at' | 'updated_at' | 'active_status'>;

const emptyForm: ProductForm = { product_name: '', category: '', stock: 0, unit: '', selling_price: 0, cost_price: 0 };

export default function ProductsPage() {
  const { t } = useTranslation();
  const { data: products = [], isError, refetch } = useProducts();
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
    if (editId) {
      mutation.mutate({ action: 'update', product: { product_id: editId, ...form } });
    } else {
      mutation.mutate({ action: 'add', product: { ...form, active_status: true } });
    }
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

  const columns = [
    { key: 'product_name', label: t('products.name') },
    { key: 'category', label: t('products.category') },
    { key: 'stock', label: t('products.stock'), render: (row: Product) => row.stock < 5 ? <Badge variant="warning">{row.stock}</Badge> : row.stock },
    { key: 'unit', label: t('products.unit') },
    { key: 'selling_price', label: t('products.selling_price'), render: (row: Product) => formatCurrency(row.selling_price) },
    { key: 'cost_price', label: t('products.cost_price'), render: (row: Product) => formatCurrency(row.cost_price) },
    {
      key: 'actions', label: t('common.actions'), render: (row: Product) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setStockModal({ id: row.product_id, name: row.product_name })}>{t('products.stock')}</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('products.title')}</h1>
        <Button onClick={openAdd}>{t('products.add')}</Button>
      </div>

      {isError ? <QueryError onRetry={() => refetch()} /> : <DataTable columns={columns} data={products} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('common.edit') + ' ' + t('products.title') : t('products.add')}>
        <div className="space-y-3">
          <Input label={t('products.name')} value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
          <Input label={t('products.category')} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Input label={t('products.stock')} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
          <Input label={t('products.unit')} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          <Input label={t('products.selling_price')} type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: +e.target.value })} />
          <Input label={t('products.cost_price')} type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: +e.target.value })} />
          <Button onClick={handleSubmit} className="w-full">{editId ? t('common.save') : t('common.add')}</Button>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`${t('products.adjust_stock')} - ${stockModal?.name ?? ''}`}>
        <div className="space-y-3">
          <Input label={t('products.adjustment')} type="number" value={adjustment} onChange={e => setAdjustment(+e.target.value)} />
          <Button onClick={handleStockAdjust} className="w-full">{t('common.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
