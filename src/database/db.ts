import Dexie, { type Table } from 'dexie';
import type { User, Member, Coach, Product, Package, PackageCoach, MemberPackage, Booking, ProductSale, MemberPayment, CoachCommission } from '@/types';

class XSportDB extends Dexie {
  users!: Table<User>;
  members!: Table<Member>;
  coaches!: Table<Coach>;
  products!: Table<Product>;
  packages!: Table<Package>;
  packageCoaches!: Table<PackageCoach>;
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

    // v4: add packageCoaches relation table, remove commission from coaches
    this.version(4)
      .stores({
        users: 'id, email, role',
        members: 'member_id, email, status_active',
        coaches: 'coach_id, email, active_status',
        products: 'product_id, category, active_status',
        packages: 'package_id, package_type, active_status',
        packageCoaches: 'package_coach_id, package_id, coach_id',
        memberPackages: 'member_package_id, member_id, package_id, status',
        bookings: 'booking_id, member_id, coach_id, booking_date, booking_status',
        productSales: 'transaction_id, transaction_date, payment_method',
        memberPayments: 'payment_id, member_id, package_id, payment_date',
        coachCommissions: 'commission_id, coach_id, member_id, booking_id, date',
      })
      .upgrade(async tx => {
        // Migrate: for each coach with commission_percentage, create packageCoach
        // entries for all active packages (preserving their old rate).
        const coaches = await tx.table('coaches').toArray();
        const packages = await tx.table('packages').filter((p: Record<string, unknown>) => p.active_status === true).toArray();
        const entries: Record<string, unknown>[] = [];

        for (const coach of coaches) {
          const pct = (coach as Record<string, unknown>).commission_percentage;
          if (typeof pct === 'number' && pct > 0) {
            for (const pkg of packages) {
              entries.push({
                package_coach_id: crypto.randomUUID(),
                package_id: (pkg as Record<string, unknown>).package_id,
                coach_id: (coach as Record<string, unknown>).coach_id,
                commission_percentage: pct,
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        if (entries.length > 0) {
          await tx.table('packageCoaches').bulkAdd(entries);
        }
      });
  }
}

export const db = new XSportDB();
