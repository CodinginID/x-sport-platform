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
  commission_type: z.enum(['percentage', 'fixed']),
  commission_percentage: z.coerce.number().min(0, 'Minimal 0').max(100, 'Maksimal 100'),
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

export type MemberFormData = z.infer<typeof memberSchema>;
export type CoachFormData = z.infer<typeof coachSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type PackageFormData = z.infer<typeof packageSchema>;
