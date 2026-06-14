// Sumber kebenaran daftar fitur premium add-on.
// Tambah entry baru di sini untuk menjual fitur baru.
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Daftar key fitur (untuk iterasi UI). */
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
