/**
 * Supabase mock that bridges reads/writes to the local Dexie DB.
 * Used in unit tests so hooks that migrated to Supabase still pass
 * tests that set up data via Dexie.
 *
 * Filter rule: if a record is missing a filtered field (undefined),
 * it passes — test data added without studio_id is always accessible.
 */
import 'fake-indexeddb/auto';
import { db } from '@/database/db';
import { generateId } from '@/utils';
import { addDays } from 'date-fns';

// --- Dexie table registry ---
const DEXIE: Record<string, () => any> = {
  products: () => db.products,
  members: () => db.members,
  coaches: () => db.coaches,
  packages: () => db.packages,
  member_packages: () => db.memberPackages,
  bookings: () => db.bookings,
  member_payments: () => db.memberPayments,
  product_sales: () => db.productSales,
  coach_commissions: () => db.coachCommissions,
};

const PK: Record<string, string> = {
  products: 'product_id',
  members: 'member_id',
  coaches: 'coach_id',
  packages: 'package_id',
  member_packages: 'member_package_id',
  bookings: 'booking_id',
  member_payments: 'payment_id',
  product_sales: 'transaction_id',
  coach_commissions: 'commission_id',
};

// In-memory store for auth tables (not in Dexie)
const AUTH_STORE: Record<string, any[]> = {
  license_users: [
    {
      email: 'admin@studio.com',
      // Legacy btoa format — verifyPassword falls back to btoa check
      password_hash: typeof btoa === 'function' ? btoa('admin123') : Buffer.from('admin123').toString('base64'),
      full_name: 'Admin Studio',
      role: 'owner',
      license_id: 'test-license-id',
      created_at: '2024-01-01T00:00:00',
    },
  ],
  licenses: [
    {
      id: 'test-license-id',
      license_key: 'XSP-TEST-0001',
      studio_name: 'Test Studio',
      studio_address: null,
      owner_email: 'admin@studio.com',
      owner_phone: null,
      plan: 'basic',
      features: {},
      storage_quota_mb: 1000,
      storage_used_mb: 0,
      expires_at: '2099-12-31T00:00:00',
      grace_period_days: 7,
      activated_at: '2024-01-01T00:00:00',
      device_fingerprint: null,
      last_validated_at: null,
      is_active: true,
    },
  ],
  sessions: [],
  users: [],
};

// --- Filter helpers ---
function matches(row: any, filters: { field: string; value: any; op: string }[]): boolean {
  return filters.every(({ field, value, op }) => {
    const actual = row[field];
    if (actual === undefined) return true; // test rows without the field always pass
    switch (op) {
      case 'eq': return actual === value;
      case 'gte': return actual >= value;
      case 'lte': return actual <= value;
      case 'gt': return actual > value;
      case 'is': return value === null ? actual == null : actual === value;
      case 'ilike': {
        const pat = (value as string).replace(/%/g, '.*').replace(/_/g, '.');
        return typeof actual === 'string' && new RegExp('^' + pat + '$', 'i').test(actual);
      }
      default: return true;
    }
  });
}

// --- Dexie-backed builder ---
function makeDexieBuilder(tableName: string) {
  const table = DEXIE[tableName];
  const filters: { field: string; value: any; op: string }[] = [];
  let limitN: number | null = null;

  async function fetchRows() {
    if (!table) return [];
    const all = await table().toArray();
    let rows = all.filter((r: any) => matches(r, filters));
    if (limitN !== null) rows = rows.slice(0, limitN);
    return rows;
  }

  const b: any = {
    select() { return b; },
    eq(f: string, v: any) { filters.push({ field: f, value: v, op: 'eq' }); return b; },
    gte(f: string, v: any) { filters.push({ field: f, value: v, op: 'gte' }); return b; },
    lte(f: string, v: any) { filters.push({ field: f, value: v, op: 'lte' }); return b; },
    gt(f: string, v: any) { filters.push({ field: f, value: v, op: 'gt' }); return b; },
    is(f: string, v: any) { filters.push({ field: f, value: v, op: 'is' }); return b; },
    ilike(f: string, v: any) { filters.push({ field: f, value: v, op: 'ilike' }); return b; },
    order() { return b; },
    limit(n: number) { limitN = n; return b; },

    insert(data: any) {
      const records: any[] = Array.isArray(data) ? data : [data];
      if (table) records.forEach((r: any) => table().put(r));
      // Return a builder that supports .select().single() for cases like sessions.insert({}).select('id').single()
      const insertResult = records;
      const ib: any = {
        select() { return ib; },
        async single() { return { data: insertResult[0] ?? null, error: null }; },
        then(resolve: any) { return Promise.all(records.map((r: any) => table ? table().put(r) : Promise.resolve())).then(() => resolve({ data: records, error: null })); },
      };
      return ib;
    },

    update(updateData: any) {
      const updateFilters = [...filters];
      const ub: any = {
        eq(f: string, v: any) { updateFilters.push({ field: f, value: v, op: 'eq' }); return ub; },
        then(resolve: any) {
          if (!table) { resolve({ data: null, error: null }); return; }
          return table().toArray().then((all: any[]) => {
            const hits = all.filter((r: any) => matches(r, updateFilters));
            const pk = PK[tableName];
            return Promise.all(hits.map((r: any) => pk && r[pk] ? table().update(r[pk], updateData) : Promise.resolve()));
          }).then(() => resolve({ data: null, error: null }));
        },
      };
      return ub;
    },

    delete() {
      const delFilters = [...filters];
      const db2: any = {
        eq(f: string, v: any) { delFilters.push({ field: f, value: v, op: 'eq' }); return db2; },
        then(resolve: any) {
          if (!table) { resolve({ data: null, error: null }); return; }
          return table().toArray().then((all: any[]) => {
            const hits = all.filter((r: any) => matches(r, delFilters));
            const pk = PK[tableName];
            return Promise.all(hits.map((r: any) => pk && r[pk] ? table().delete(r[pk]) : Promise.resolve()));
          }).then(() => resolve({ data: null, error: null }));
        },
      };
      return db2;
    },

    async single() {
      const rows = await fetchRows();
      const row = rows[0] ?? null;
      return { data: row, error: row ? null : { message: 'Not found', code: 'PGRST116' } };
    },

    async maybeSingle() {
      const rows = await fetchRows();
      return { data: rows[0] ?? null, error: null };
    },

    then(resolve: any) {
      return fetchRows().then((rows: any[]) => resolve({ data: rows, error: null }));
    },
  };
  return b;
}

// --- Auth-table builder (in-memory only) ---
function makeAuthBuilder(tableName: string) {
  const filters: { field: string; value: any; op: string }[] = [];

  function getRows() {
    return (AUTH_STORE[tableName] ?? []).filter((r) => matches(r, filters));
  }

  const b: any = {
    select() { return b; },
    eq(f: string, v: any) { filters.push({ field: f, value: v, op: 'eq' }); return b; },
    ilike(f: string, v: any) { filters.push({ field: f, value: v, op: 'ilike' }); return b; },
    order() { return b; },
    limit() { return b; },

    insert(data: any) {
      const records: any[] = Array.isArray(data) ? data : [data];
      const withIds = records.map((r) => ({ id: generateId(), ...r }));
      AUTH_STORE[tableName] = [...(AUTH_STORE[tableName] ?? []), ...withIds];
      const ib: any = {
        select() { return ib; },
        async single() { return { data: withIds[0] ?? null, error: null }; },
        then(resolve: any) { resolve({ data: withIds, error: null }); },
      };
      return ib;
    },

    delete() {
      const db2: any = {
        eq() { return db2; },
        then(resolve: any) { resolve({ data: null, error: null }); },
      };
      return db2;
    },

    async single() {
      const rows = getRows();
      const row = rows[0] ?? null;
      return { data: row, error: row ? null : { message: 'Not found', code: 'PGRST116' } };
    },

    async maybeSingle() {
      return { data: getRows()[0] ?? null, error: null };
    },

    then(resolve: any) {
      resolve({ data: getRows(), error: null });
    },
  };
  return b;
}

// --- RPC simulations ---
async function rpcAttendBooking({ p_booking_id }: { p_booking_id: string; p_studio_id: string }) {
  const booking = await db.bookings.get(p_booking_id);
  if (!booking) return { data: null, error: { message: 'Booking not found' } };

  await db.bookings.update(p_booking_id, { booking_status: 'attended' });

  const coach = booking.coach_id ? await db.coaches.get(booking.coach_id) : null;
  if (booking.member_package_id) {
    const mp = await db.memberPackages.get(booking.member_package_id);
    if (mp) {
      await db.memberPackages.update(mp.member_package_id, {
        remaining_sessions: Math.max(0, (mp.remaining_sessions ?? 0) - 1),
      });
    }
  }

  if (coach) {
    const rate = coach.commission_regular_pct ?? 0;
    await db.coachCommissions.add({
      commission_id: generateId(),
      booking_id: p_booking_id,
      coach_id: coach.coach_id,
      member_id: booking.member_id,
      package_price: booking.package_price ?? 0,
      commission_percentage: rate,
      commission_amount: (booking.package_price ?? 0) * rate / 100,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    });
  }

  return { data: null, error: null };
}

async function rpcCreateMemberPayment({ p_studio_id, p_payment, p_member_package }: {
  p_studio_id: string;
  p_payment: { payment_date: string; member_id: string; package_id: string; amount: number; payment_method: string; notes: string };
  p_member_package: { member_id: string; package_id: string; purchase_date: string; expired_date: string; remaining_sessions: number };
  p_booking_id?: string | null;
}) {
  const paymentId = generateId();
  await db.memberPayments.add({
    payment_id: paymentId,
    payment_date: p_payment.payment_date,
    member_id: p_payment.member_id,
    package_id: p_payment.package_id,
    amount: p_payment.amount,
    payment_method: p_payment.payment_method as any,
    notes: p_payment.notes,
    created_at: new Date().toISOString(),
  });

  await db.memberPackages.add({
    member_package_id: generateId(),
    member_id: p_member_package.member_id,
    package_id: p_member_package.package_id,
    purchase_date: p_member_package.purchase_date,
    expired_date: p_member_package.expired_date,
    total_sessions: p_member_package.remaining_sessions,
    remaining_sessions: p_member_package.remaining_sessions,
    status: 'active',
    created_at: new Date().toISOString(),
  });

  return { data: null, error: null };
}

// --- Exported mock ---
const AUTH_TABLE_NAMES = new Set(['license_users', 'licenses', 'sessions', 'users']);

export const supabase = {
  from(tableName: string) {
    if (AUTH_TABLE_NAMES.has(tableName)) return makeAuthBuilder(tableName);
    return makeDexieBuilder(tableName);
  },
  rpc(name: string, args: any) {
    if (name === 'attend_booking') return rpcAttendBooking(args);
    if (name === 'create_member_payment') return rpcCreateMemberPayment(args);
    return Promise.resolve({ data: null, error: null });
  },
};

export const BACKUP_BUCKET = 'backups';
