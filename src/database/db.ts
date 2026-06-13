import Dexie, { type Table } from 'dexie';
import type { User, Member, Coach, Product, Package, MemberPackage, Booking, ProductSale, MemberPayment, CoachCommission } from '@/types';

class XSportDB extends Dexie {
  users!: Table<User>;
  members!: Table<Member>;
  coaches!: Table<Coach>;
  products!: Table<Product>;
  packages!: Table<Package>;
  memberPackages!: Table<MemberPackage>;
  bookings!: Table<Booking>;
  productSales!: Table<ProductSale>;
  memberPayments!: Table<MemberPayment>;
  coachCommissions!: Table<CoachCommission>;

  constructor() {
    super('XSportDB');
    this.version(2).stores({
      users: 'id, email, role',
      members: 'member_id, email, status_active',
      coaches: 'coach_id, email, active_status',
      products: 'product_id, category, active_status',
      packages: 'package_id, package_type, active_status',
      memberPackages: 'member_package_id, member_id, package_id, status',
      bookings: 'booking_id, member_id, coach_id, booking_date, booking_status',
      productSales: 'transaction_id, transaction_date',
      memberPayments: 'payment_id, member_id, package_id, payment_date',
      coachCommissions: 'commission_id, coach_id, member_id, booking_id, date',
    });

    // v3: add cashier fields to productSales (payment_method, cash_received,
    // change, discount, subtotal, notes). Indexes unchanged. Upgrade migrates
    // legacy rows so reading them returns a fully populated ProductSale.
    this.version(3)
      .stores({
        users: 'id, email, role',
        members: 'member_id, email, status_active',
        coaches: 'coach_id, email, active_status',
        products: 'product_id, category, active_status',
        packages: 'package_id, package_type, active_status',
        memberPackages: 'member_package_id, member_id, package_id, status',
        bookings: 'booking_id, member_id, coach_id, booking_date, booking_status',
        productSales: 'transaction_id, transaction_date, payment_method',
        memberPayments: 'payment_id, member_id, package_id, payment_date',
        coachCommissions: 'commission_id, coach_id, member_id, booking_id, date',
      })
      .upgrade(async tx => {
        await tx.table('productSales').toCollection().modify((sale: Record<string, unknown>) => {
          if (sale.subtotal === undefined) sale.subtotal = sale.total;
          if (sale.discount === undefined) sale.discount = 0;
          if (sale.payment_method === undefined) sale.payment_method = 'cash';
          if (sale.cash_received === undefined) sale.cash_received = sale.total;
          if (sale.change === undefined) sale.change = 0;
          if (sale.notes === undefined) sale.notes = '';
        });
      });

    // v4: komisi pindah ke coach (commission_regular_pct / commission_private_pct).
    // package_coaches dibuang dari kode (komisi per coach×kategori).
    this.version(4)
      .stores({
        users: 'id, email, role',
        members: 'member_id, email, status_active',
        coaches: 'coach_id, email, active_status',
        products: 'product_id, category, active_status',
        packages: 'package_id, package_type, active_status',
        memberPackages: 'member_package_id, member_id, package_id, status',
        bookings: 'booking_id, member_id, coach_id, booking_date, booking_status',
        productSales: 'transaction_id, transaction_date, payment_method',
        memberPayments: 'payment_id, member_id, package_id, payment_date',
        coachCommissions: 'commission_id, coach_id, member_id, booking_id, date',
      });
  }
}

export const db = new XSportDB();
