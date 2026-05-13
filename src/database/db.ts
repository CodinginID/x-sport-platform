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
  }
}

export const db = new XSportDB();
