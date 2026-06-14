// Sumber kebenaran daftar fitur premium add-on.
// Harga, WA admin, & rekening dikonfigurasi superadmin (tabel platform_config), bukan di sini.
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
    trial_days: 3,
    details: [
      'Jadwal sesi tampil sebagai kartu per tanggal yang rapi',
      'Ringkasan harian: jumlah sesi & berapa yang masih ada slot kosong',
      'Sesi dengan slot kosong langsung disorot — cari jadwal jadi cepat',
      'Bedakan sesi penuh vs tersedia secara visual',
    ],
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
