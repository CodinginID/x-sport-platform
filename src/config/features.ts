// Sumber kebenaran daftar fitur premium add-on.
// Harga, WA admin, & rekening dikonfigurasi superadmin (tabel platform_config), bukan di sini.
export const FEATURES = {
  pro: {
    label: 'Paket Pro',
    description: 'Buka semua tampilan premium: dashboard grafik, jadwal cantik, laporan, dan UI yang lebih mulus.',
    trial_days: 3,
    details: [
      'Dashboard grafik & insight: tren pendapatan, kehadiran, jam tersibuk, okupansi',
      'Jadwal sesi tampilan premium: cari slot kosong lebih cepat',
      'Dropdown & loading yang lebih mulus saat memuat data',
      'Laporan dengan grafik + export PDF/Excel',
    ],
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
