import { z } from 'zod';

export const memberSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  phone_number: z.string().min(1, 'No. telepon wajib diisi').regex(/^[0-9+\-\s()]+$/, 'Format telepon tidak valid'),
  email: z.string().email('Format email tidak valid').or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']),
  birth_date: z.string(),
  address: z.string(),
  notes: z.string(),
});

export const coachSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  phone_number: z.string().min(1, 'No. telepon wajib diisi').regex(/^[0-9+\-\s()]+$/, 'Format telepon tidak valid'),
  email: z.string().email('Format email tidak valid').or(z.literal('')),
  notes: z.string(),
});

export const productSchema = z.object({
  product_name: z.string().min(1, 'Nama produk wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  stock: z.coerce.number().min(0, 'Stok minimal 0'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  selling_price: z.coerce.number().min(1, 'Harga jual harus > 0'),
  cost_price: z.coerce.number().min(0, 'Harga modal minimal 0'),
});

export const packageSchema = z.object({
  package_name: z.string().min(1, 'Nama paket wajib diisi'),
  package_type: z.enum(['session', 'duration']),
  session_count: z.coerce.number().nullable(),
  valid_days: z.coerce.number().min(1, 'Minimal 1 hari'),
  package_price: z.coerce.number().min(1, 'Harga harus > 0'),
  description: z.string(),
});

export const paymentMethodSchema = z.enum(['cash', 'transfer', 'qris']);

export const productSaleItemSchema = z.object({
  product_id: z.string().min(1, 'Produk wajib dipilih'),
  product_name: z.string().min(1),
  quantity: z.coerce.number().int().min(1, 'Qty minimal 1'),
  unit_price: z.coerce.number().min(0),
  subtotal: z.coerce.number().min(0),
});

export const productSaleSchema = z
  .object({
    transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
    customer_name: z.string().min(1, 'Nama pelanggan wajib diisi'),
    items: z.array(productSaleItemSchema).min(1, 'Minimal 1 item'),
    subtotal: z.coerce.number().min(0),
    discount: z.coerce.number().min(0, 'Diskon minimal 0'),
    total: z.coerce.number().min(0),
    payment_method: paymentMethodSchema,
    cash_received: z.coerce.number().min(0),
    change: z.coerce.number().min(0),
    notes: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.discount > val.subtotal) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount'],
        message: 'Diskon tidak boleh melebihi subtotal',
      });
    }
    const expectedTotal = Math.max(0, val.subtotal - val.discount);
    if (Math.abs(val.total - expectedTotal) > 0.5) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'Total tidak konsisten dengan subtotal dan diskon',
      });
    }
    if (val.payment_method === 'cash' && val.cash_received < val.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['cash_received'],
        message: 'Uang diterima kurang dari total',
      });
    }
  });

export const memberPaymentSchema = z.object({
  payment_date: z.string().min(1, 'Tanggal wajib diisi'),
  member_id: z.string().min(1, 'Member wajib dipilih'),
  package_id: z.string().min(1, 'Paket wajib dipilih'),
  amount: z.coerce.number().min(1, 'Jumlah harus > 0'),
  payment_method: paymentMethodSchema,
  notes: z.string(),
});

export type MemberFormData = z.infer<typeof memberSchema>;
export type CoachFormData = z.infer<typeof coachSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type PackageFormData = z.infer<typeof packageSchema>;
export type ProductSaleFormData = z.infer<typeof productSaleSchema>;
export type ProductSaleItemFormData = z.infer<typeof productSaleItemSchema>;
export type MemberPaymentFormData = z.infer<typeof memberPaymentSchema>;
