// Sumber kebenaran daftar fitur premium add-on.
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
    trial_days: 3,
    price: 99000, // Rp — TODO: konfirmasi harga final ke user
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

// Nomor WhatsApp admin untuk konfirmasi pembayaran add-on.
// TODO: ganti dengan nomor asli (format internasional tanpa +, mis. 628123456789).
export const ADMIN_WA = '628000000000';
