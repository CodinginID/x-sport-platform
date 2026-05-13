import { useState } from 'react';
import { useProducts, useProductMutation } from '@/hooks';
import { formatCurrency } from '@/utils';
import { DataTable, Button, Modal, Badge, Input } from '@/components/ui';
import { Product } from '@/types';

type ProductForm = Omit<Product, 'product_id' | 'created_at' | 'updated_at' | 'active_status'>;

const emptyForm: ProductForm = { product_name: '', category: '', stock: 0, unit: '', selling_price: 0, cost_price: 0 };

export default function ProductsPage() {
  const { data: products = [] } = useProducts();
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
    if (stockModal) {
      mutation.mutate({ action: 'adjust_stock', product: { product_id: stockModal.id }, adjustment });
    }
    setStockModal(null);
    setAdjustment(0);
  };

  const columns = [
    { key: 'product_name', label: 'Nama Produk' },
    { key: 'category', label: 'Kategori' },
    { key: 'stock', label: 'Stok', render: (row: Product) => row.stock < 5 ? <Badge variant="warning">{row.stock}</Badge> : row.stock },
    { key: 'unit', label: 'Satuan' },
    { key: 'selling_price', label: 'Harga Jual', render: (row: Product) => formatCurrency(row.selling_price) },
    { key: 'cost_price', label: 'Harga Modal', render: (row: Product) => formatCurrency(row.cost_price) },
    {
      key: 'actions', label: 'Aksi', render: (row: Product) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setStockModal({ id: row.product_id, name: row.product_name })}>Stok</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Button onClick={openAdd}>Tambah Produk</Button>
      </div>

      <DataTable columns={columns} data={products} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Produk' : 'Tambah Produk'}>
        <div className="space-y-3">
          <Input label="Nama Produk" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
          <Input label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Input label="Stok" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
          <Input label="Satuan" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          <Input label="Harga Jual" type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: +e.target.value })} />
          <Input label="Harga Modal" type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: +e.target.value })} />
          <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjustment Stok - ${stockModal?.name ?? ''}`}>
        <div className="space-y-3">
          <Input label="Jumlah (+/-)" type="number" value={adjustment} onChange={e => setAdjustment(+e.target.value)} />
          <Button onClick={handleStockAdjust} className="w-full">Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
