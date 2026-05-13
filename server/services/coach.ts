
import db from '../db.ts';

export const CoachService = {
  getCommissionReport: (tenantId: string, coachId?: string) => {
    let query = `
      SELECT 
        u.full_name as coach_name,
        SUM(b.commission_amount) as total_commission,
        COUNT(b.id) as total_bookings
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON c.coach_id = u.id
      WHERE b.tenant_id = ?
    `;
    const params = [tenantId];

    if (coachId) {
      query += ' AND u.id = ?';
      params.push(coachId);
    }

    query += ' GROUP BY u.id';
    return db.prepare(query).all(...params);
  },

  listCoaches: (tenantId: string) => {
    return db.prepare("SELECT id, full_name, email FROM users WHERE tenant_id = ? AND role = 'coach'").all(tenantId);
  }
};
