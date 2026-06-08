import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getStudioId, requireStudioId } from '@/utils/studioContext';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { useToastStore } from '@/stores/toast';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const studioId = getStudioId();
      if (!studioId) return [];
      const { data, error } = await supabase
        .from('products').select('*')
        .eq('studio_id', studioId)
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Product[];
    },
  });
}

export function useProductMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: 'add' | 'update' | 'adjust_stock'; product: Partial<Product>; adjustment?: number }) => {
      const studioId = requireStudioId();
      const now = new Date().toISOString();

      if (data.action === 'add') {
        const product: Product & { studio_id: string } = {
          product_id: generateId(),
          studio_id: studioId,
          product_name: data.product.product_name || '',
          category: data.product.category || '',
          stock: data.product.stock ?? 0,
          unit: data.product.unit || 'pcs',
          selling_price: data.product.selling_price ?? 0,
          cost_price: data.product.cost_price ?? 0,
          active_status: data.product.active_status ?? true,
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from('products').insert(product);
        if (error) throw new Error(error.message);
        return product;
      }

      if (data.action === 'adjust_stock') {
        const { data: current, error: fetchErr } = await supabase
          .from('products').select('stock')
          .eq('product_id', data.product.product_id!)
          .eq('studio_id', studioId)
          .single();
        if (fetchErr) throw new Error(fetchErr.message);
        const { error } = await supabase.from('products')
          .update({ stock: (current.stock as number) + (data.adjustment ?? 0), updated_at: now })
          .eq('product_id', data.product.product_id!)
          .eq('studio_id', studioId);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase.from('products')
        .update({ ...data.product, updated_at: now })
        .eq('product_id', data.product.product_id!)
        .eq('studio_id', studioId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      const msg = vars.action === 'add' ? 'Produk berhasil ditambahkan' : vars.action === 'adjust_stock' ? 'Stok berhasil disesuaikan' : 'Produk berhasil diperbarui';
      useToastStore.getState().addToast(msg, 'success');
    },
    onError: (e: Error) => { useToastStore.getState().addToast(e.message || 'Gagal menyimpan produk', 'error'); },
  });
}
