# X-Sport Platform

Studio & Wellness Management Platform — PWA Offline-First

## Overview

Platform manajemen studio olahraga dan wellness berbasis web offline-first untuk:
- Pilates / Yoga / Gym / Dance Studio
- Personal Trainer Studio
- Wellness Center

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| State | Zustand (auth persist) |
| Data Fetching | TanStack Query v5 |
| Offline DB | Dexie.js (IndexedDB) |
| Forms | React Hook Form |
| Routing | React Router DOM 7 |
| PWA | vite-plugin-pwa |
| Icons | Lucide React |
| Date | date-fns |

## Folder Structure

```
src/
├── types/          # TypeScript interfaces (Member, Coach, Product, etc.)
├── database/       # Dexie schema (db.ts) + demo seeder (seed.ts)
├── utils/          # Helpers (id, date, format, cn)
├── stores/         # Zustand stores (auth)
├── hooks/          # TanStack Query hooks per entity
├── components/ui/  # Reusable UI components
├── layouts/        # AppLayout (sidebar + bottom nav)
└── modules/
    ├── auth/       # Login page
    ├── dashboard/  # Dashboard summary
    ├── members/    # CRUD + detail page
    ├── coaches/    # CRUD
    ├── products/   # CRUD + stock adjustment
    ├── packages/   # CRUD
    ├── bookings/   # Booking + check-in
    ├── payments/   # Product sales + member payments
    ├── commissions/# Coach commissions
    └── reports/    # 6 report tabs
```

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo Login

- Email: `admin@studio.com`
- Password: `admin123`

## Features (MVP)

- ✅ Login + remember me (Zustand persist)
- ✅ Dashboard (member aktif, jadwal hari ini, pemasukan, stok menipis, coach aktif)
- ✅ Member management (CRUD lengkap, semua field PRD)
- ✅ Coach management (commission_type, commission_percentage)
- ✅ Product management (stock adjustment, low stock alert)
- ✅ Package management (session/duration based)
- ✅ Booking (admin pilih member+coach+paket+tanggal+jam, auto populate harga)
- ✅ Check-in (saldo sesi otomatis berkurang, komisi coach otomatis dihitung)
- ✅ Product sales (multi-item, stock auto decrement)
- ✅ Member payment (auto create member package + saldo sesi)
- ✅ Coach commission (auto dari check-in, formula: package_price × commission_percentage)
- ✅ Reports: Penjualan, Pembayaran Member, Detail Member, Saldo Member, Komisi Coach, Profit
- ✅ Offline-first (semua data di IndexedDB, app berjalan tanpa internet)
- ✅ PWA (installable, service worker)
- ✅ Responsive (tablet + desktop)

## Offline-First Architecture

Semua data disimpan di IndexedDB via Dexie.js. Tidak ada backend/server yang dibutuhkan untuk operasional harian. Future: cloud sync via Supabase.
