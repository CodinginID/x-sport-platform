
import db from '../db.ts';
import { z } from 'zod';

export const BookingSchema = z.object({
  tenant_id: z.string(),
  user_id: z.string(),
  class_id: z.string(),
});

export const BookingService = {
  create: (data: z.infer<typeof BookingSchema>) => {
    // 1. Get class details to calculate commission
    const classData = db.prepare('SELECT price, coach_commission_percent FROM classes WHERE id = ? AND tenant_id = ?').get(data.class_id, data.tenant_id) as any;
    if (!classData) throw new Error('Class not found');

    // 2. Check membership/credits
    const userMembership = db.prepare('SELECT id, sessions_remaining FROM user_memberships WHERE user_id = ? AND tenant_id = ? AND sessions_remaining > 0 ORDER BY created_at ASC').get(data.user_id, data.tenant_id) as any;
    if (!userMembership) throw new Error('No active membership sessions available');

    const commissionAmount = (classData.price * classData.coach_commission_percent) / 100;
    const bookingId = crypto.randomUUID();

    const transaction = db.transaction(() => {
      // Create booking
      db.prepare('INSERT INTO bookings (id, tenant_id, user_id, class_id, commission_amount) VALUES (?, ?, ?, ?, ?)').run(
        bookingId, data.tenant_id, data.user_id, data.class_id, commissionAmount
      );

      // Consume session
      db.prepare('UPDATE user_memberships SET sessions_remaining = sessions_remaining - 1 WHERE id = ?').run(userMembership.id);
    });

    transaction();
    return { id: bookingId, commissionAmount };
  },

  list: (tenantId: string, filters: { userId?: string, classId?: string } = {}) => {
    let query = 'SELECT b.*, u.full_name as user_name, c.name as class_name, c.start_time FROM bookings b JOIN users u ON b.user_id = u.id JOIN classes c ON b.class_id = c.id WHERE b.tenant_id = ?';
    const params = [tenantId];
    
    if (filters.userId) {
      query += ' AND b.user_id = ?';
      params.push(filters.userId);
    }
    
    return db.prepare(query).all(...params);
  }
};

export const MembershipService = {
  createPackage: (data: any) => {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO membership_packages (id, tenant_id, name, price, max_sessions, duration_days) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, data.tenant_id, data.name, data.price, data.max_sessions, data.duration_days
    );
    return id;
  },

  purchasePackage: (tenantId: string, userId: string, packageId: string) => {
    const pkg = db.prepare('SELECT * FROM membership_packages WHERE id = ? AND tenant_id = ?').get(packageId, tenantId) as any;
    if (!pkg) throw new Error('Package not found');

    const expiresAt = pkg.duration_days ? new Date(Date.now() + pkg.duration_days * 86400000).toISOString() : null;
    const id = crypto.randomUUID();

    db.prepare('INSERT INTO user_memberships (id, tenant_id, user_id, package_id, sessions_remaining, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, tenantId, userId, packageId, pkg.max_sessions, expiresAt
    );
    return id;
  },

  getPackages: (tenantId: string) => {
    return db.prepare('SELECT * FROM membership_packages WHERE tenant_id = ?').all(tenantId);
  }
};
