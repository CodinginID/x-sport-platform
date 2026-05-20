import { db } from '@/database/db';
import type { Member, Coach, Product, Package, PackageCoach, MemberPackage, Booking, ProductSale, MemberPayment, CoachCommission } from '@/types';
import { format, subDays, addDays } from 'date-fns';

export async function seedDatabase() {
  const memberCount = await db.members.count();
  if (memberCount > 0) return;

  const now = format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss');
  const today = format(new Date(), 'yyyy-MM-dd');

  // IDs
  const memberId1 = crypto.randomUUID();
  const memberId2 = crypto.randomUUID();
  const memberId3 = crypto.randomUUID();
  const coachId1 = crypto.randomUUID();
  const coachId2 = crypto.randomUUID();
  const productId1 = crypto.randomUUID();
  const productId2 = crypto.randomUUID();
  const productId3 = crypto.randomUUID();
  const packageId1 = crypto.randomUUID();
  const packageId2 = crypto.randomUUID();
  const packageId3 = crypto.randomUUID();
  const memberPackageId1 = crypto.randomUUID();
  const memberPackageId2 = crypto.randomUUID();
  const bookingId1 = crypto.randomUUID();
  const bookingId2 = crypto.randomUUID();
  const bookingId3 = crypto.randomUUID();

  const members: Member[] = [
    { member_id: memberId1, full_name: 'Andi Pratama', phone_number: '081234567890', email: 'andi@email.com', gender: 'male', birth_date: '1995-03-15', address: 'Jl. Sudirman No. 10, Jakarta', join_date: format(subDays(new Date(), 60), 'yyyy-MM-dd'), status_active: true, notes: '', created_at: now, updated_at: now },
    { member_id: memberId2, full_name: 'Siti Rahayu', phone_number: '081298765432', email: 'siti@email.com', gender: 'female', birth_date: '1998-07-22', address: 'Jl. Gatot Subroto No. 5, Jakarta', join_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'), status_active: true, notes: 'Prefer morning sessions', created_at: now, updated_at: now },
    { member_id: memberId3, full_name: 'Budi Santoso', phone_number: '081377889900', email: 'budi@email.com', gender: 'male', birth_date: '1990-11-08', address: 'Jl. Thamrin No. 20, Jakarta', join_date: format(subDays(new Date(), 90), 'yyyy-MM-dd'), status_active: true, notes: '', created_at: now, updated_at: now },
  ];

  const coaches: Coach[] = [
    { coach_id: coachId1, full_name: 'Rizky Firmansyah', phone_number: '081511223344', email: 'rizky@studio.com', active_status: true, notes: 'Specialist badminton', created_at: now, updated_at: now },
    { coach_id: coachId2, full_name: 'Dewi Lestari', phone_number: '081655667788', email: 'dewi@studio.com', active_status: true, notes: 'Yoga & pilates', created_at: now, updated_at: now },
  ];

  const products: Product[] = [
    { product_id: productId1, product_name: 'Shuttlecock Yonex', category: 'Equipment', stock: 50, unit: 'tube', selling_price: 85000, cost_price: 65000, active_status: true, created_at: now, updated_at: now },
    { product_id: productId2, product_name: 'Handuk Olahraga', category: 'Accessories', stock: 30, unit: 'pcs', selling_price: 35000, cost_price: 20000, active_status: true, created_at: now, updated_at: now },
    { product_id: productId3, product_name: 'Air Mineral 600ml', category: 'Beverages', stock: 100, unit: 'botol', selling_price: 5000, cost_price: 3000, active_status: true, created_at: now, updated_at: now },
  ];

  const packages: Package[] = [
    { package_id: packageId1, package_name: 'Paket 10 Sesi Badminton', package_type: 'session', session_count: 10, valid_days: 30, package_price: 500000, description: '10 sesi latihan badminton', active_status: true, created_at: now, updated_at: now },
    { package_id: packageId2, package_name: 'Paket Bulanan Gym', package_type: 'duration', session_count: null, valid_days: 30, package_price: 350000, description: 'Akses gym 30 hari', active_status: true, created_at: now, updated_at: now },
    { package_id: packageId3, package_name: 'Paket 5 Sesi Yoga', package_type: 'session', session_count: 5, valid_days: 14, package_price: 300000, description: '5 sesi yoga privat', active_status: true, created_at: now, updated_at: now },
  ];

  const packageCoaches: PackageCoach[] = [
    { package_coach_id: crypto.randomUUID(), package_id: packageId1, coach_id: coachId1, commission_percentage: 15, created_at: now },
    { package_coach_id: crypto.randomUUID(), package_id: packageId3, coach_id: coachId2, commission_percentage: 20, created_at: now },
    { package_coach_id: crypto.randomUUID(), package_id: packageId2, coach_id: coachId1, commission_percentage: 10, created_at: now },
    { package_coach_id: crypto.randomUUID(), package_id: packageId2, coach_id: coachId2, commission_percentage: 10, created_at: now },
  ];

  const memberPackages: MemberPackage[] = [
    { member_package_id: memberPackageId1, member_id: memberId1, package_id: packageId1, purchase_date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), expired_date: format(addDays(new Date(), 20), 'yyyy-MM-dd'), total_sessions: 10, remaining_sessions: 7, status: 'active', created_at: now },
    { member_package_id: memberPackageId2, member_id: memberId2, package_id: packageId3, purchase_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), expired_date: format(addDays(new Date(), 9), 'yyyy-MM-dd'), total_sessions: 5, remaining_sessions: 4, status: 'active', created_at: now },
  ];

  const bookings: Booking[] = [
    { booking_id: bookingId1, booking_date: today, booking_time: '08:00', member_id: memberId1, coach_id: coachId1, package_id: packageId1, member_package_id: memberPackageId1, package_price: 500000, booking_status: 'booked', created_at: now, updated_at: now },
    { booking_id: bookingId2, booking_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), booking_time: '10:00', member_id: memberId2, coach_id: coachId2, package_id: packageId3, member_package_id: memberPackageId2, package_price: 300000, booking_status: 'completed', created_at: now, updated_at: now },
    { booking_id: bookingId3, booking_date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), booking_time: '14:00', member_id: memberId1, coach_id: coachId1, package_id: packageId1, member_package_id: memberPackageId1, package_price: 500000, booking_status: 'cancelled', created_at: now, updated_at: now },
  ];

  const productSales: ProductSale[] = [{
    transaction_id: crypto.randomUUID(),
    transaction_date: today,
    customer_name: 'Andi Pratama',
    items: [
      { product_id: productId1, product_name: 'Shuttlecock Yonex', quantity: 2, unit_price: 85000, subtotal: 170000 },
      { product_id: productId3, product_name: 'Air Mineral 600ml', quantity: 3, unit_price: 5000, subtotal: 15000 },
    ],
    subtotal: 185000,
    discount: 0,
    total: 185000,
    payment_method: 'cash',
    cash_received: 200000,
    change: 15000,
    notes: '',
    created_at: now,
  }];

  const memberPayments: MemberPayment[] = [
    { payment_id: crypto.randomUUID(), payment_date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), member_id: memberId1, package_id: packageId1, amount: 500000, payment_method: 'transfer', notes: '', created_at: now },
    { payment_id: crypto.randomUUID(), payment_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), member_id: memberId2, package_id: packageId3, amount: 300000, payment_method: 'qris', notes: 'Promo diskon 10%', created_at: now },
  ];

  const coachCommissions: CoachCommission[] = [
    { commission_id: crypto.randomUUID(), coach_id: coachId1, booking_id: bookingId2, member_id: memberId1, package_price: 500000, commission_percentage: 15, commission_amount: 75000, date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), created_at: now },
    { commission_id: crypto.randomUUID(), coach_id: coachId2, booking_id: bookingId2, member_id: memberId2, package_price: 300000, commission_percentage: 15, commission_amount: 45000, date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), created_at: now },
  ];

  await db.transaction('rw', [db.members, db.coaches, db.products, db.packages, db.packageCoaches, db.memberPackages, db.bookings, db.productSales, db.memberPayments, db.coachCommissions], async () => {
    await db.members.bulkPut(members);
    await db.coaches.bulkPut(coaches);
    await db.products.bulkPut(products);
    await db.packages.bulkPut(packages);
    await db.packageCoaches.bulkPut(packageCoaches);
    await db.memberPackages.bulkPut(memberPackages);
    await db.bookings.bulkPut(bookings);
    await db.productSales.bulkPut(productSales);
    await db.memberPayments.bulkPut(memberPayments);
    await db.coachCommissions.bulkPut(coachCommissions);
  });
}
