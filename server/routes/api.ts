
import { Router } from 'express';
import { AuthService, authMiddleware } from '../auth.ts';
import { BookingService, MembershipService } from '../services/core.ts';
import { CoachService } from '../services/coach.ts';
import db from '../db.ts';
import bcrypt from 'bcryptjs';

const router = Router();

// Public Routes
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;
    const result = await AuthService.login(email, password, tenantId);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// Protected Routes
router.use(authMiddleware);

// --- MASTER DATA ---
router.get('/members', (req: any, res) => {
  const members = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE tenant_id = ? AND role = "client"').all(req.user.tenant_id);
  res.json(members);
});

router.post('/members', async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { email, full_name, password } = req.body;
    const hash = await bcrypt.hash(password || 'password123', 10);
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.user.tenant_id, email, hash, full_name, 'client'
    );
    res.json({ id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/coaches', (req: any, res) => {
  const coaches = CoachService.listCoaches(req.user.tenant_id);
  res.json(coaches);
});

router.post('/coaches', async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { email, full_name, password } = req.body;
    const hash = await bcrypt.hash(password || 'password123', 10);
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.user.tenant_id, email, hash, full_name, 'coach'
    );
    res.json({ id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/products', (req: any, res) => {
  const products = db.prepare('SELECT * FROM products WHERE tenant_id = ?').all(req.user.tenant_id);
  res.json(products);
});

router.post('/products', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { name, stock, price } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO products (id, tenant_id, name, stock, price) VALUES (?, ?, ?, ?, ?)').run(id, req.user.tenant_id, name, stock, price);
  res.json({ id });
});

router.get('/memberships/packages', (req: any, res) => {
  const packages = MembershipService.getPackages(req.user.tenant_id);
  res.json(packages);
});

router.post('/memberships/packages', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { type, name, price, max_sessions, duration_days } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO membership_packages (id, tenant_id, type, name, price, max_sessions, duration_days) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.tenant_id, type || 'standard', name, price, max_sessions || null, duration_days || null
  );
  res.json({ id });
});


// --- CLASSES & BOOKINGS ---
router.get('/classes', (req: any, res) => {
  const classes = db.prepare('SELECT c.*, u.full_name as coach_name FROM classes c JOIN users u ON c.coach_id = u.id WHERE c.tenant_id = ?').all(req.user.tenant_id);
  res.json(classes);
});

router.post('/classes', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent } = req.body;
  db.prepare(`
    INSERT INTO classes (id, tenant_id, coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.tenant_id, coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent);
  res.json({ id });
});

router.get('/bookings', (req: any, res) => {
  const filters: any = {};
  if (req.user.role === 'client') filters.userId = req.user.id;
  const bookings = BookingService.list(req.user.tenant_id, filters);
  res.json(bookings);
});

router.post('/bookings', (req: any, res) => {
  try {
    const result = BookingService.create({
      tenant_id: req.user.tenant_id,
      user_id: req.user.id,
      class_id: req.body.class_id
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin manual booking + attendance
router.post('/bookings/attend', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    // 1. Check if user has active membership days or sessions
    const { user_id, class_id } = req.body;
    const userMembership = db.prepare('SELECT id, package_id, sessions_remaining, days_remaining FROM user_memberships WHERE user_id = ? AND tenant_id = ? AND (sessions_remaining > 0 OR days_remaining > 0) ORDER BY created_at ASC').get(user_id, req.user.tenant_id) as any;
    if (!userMembership) return res.status(400).json({ error: 'Pasien tidak memiliki saldo paket aktif' });

    const classData = db.prepare('SELECT price, coach_commission_percent FROM classes WHERE id = ? AND tenant_id = ?').get(class_id, req.user.tenant_id) as any;
    
    // Create attended booking
    const bookingId = crypto.randomUUID();
    const transaction = db.transaction(() => {
       db.prepare(`INSERT INTO bookings (id, tenant_id, user_id, class_id, package_id, status, commission_amount) VALUES (?, ?, ?, ?, ?, 'attended', ?)`).run(
         bookingId, req.user.tenant_id, user_id, class_id, userMembership.package_id, 0
       );
       
       // Deduct automatically
       if (userMembership.sessions_remaining > 0) {
         db.prepare('UPDATE user_memberships SET sessions_remaining = sessions_remaining - 1 WHERE id = ?').run(userMembership.id);
       } else if (userMembership.days_remaining > 0) {
         db.prepare('UPDATE user_memberships SET days_remaining = days_remaining - 1 WHERE id = ?').run(userMembership.id);
       }
    });
    transaction();
    res.json({ success: true, bookingId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// --- TRANSACTIONS ---
router.post('/transactions/product', (req: any, res) => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
   try {
     const { product_id, quantity } = req.body;
     const transaction = db.transaction(() => {
        const prod = db.prepare('SELECT price, stock FROM products WHERE id = ? AND tenant_id = ?').get(product_id, req.user.tenant_id) as any;
        if (!prod || prod.stock < quantity) throw new Error('Stok tidak cukup atau produk tidak ditemukan');
        
        const totalPrice = prod.price * quantity;
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO product_sales (id, tenant_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?, ?)').run(id, req.user.tenant_id, product_id, quantity, totalPrice);
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);
        return id;
     });
     const id = transaction();
     res.json({ id });
   } catch(e: any) { res.status(400).json({ error: e.message }); }
});

router.post('/transactions/membership', (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
     const { user_id, package_id } = req.body;
     const transaction = db.transaction(() => {
       const pkg = db.prepare('SELECT price, max_sessions, duration_days FROM membership_packages WHERE id = ?').get(package_id) as any;
       if (!pkg) throw new Error('Package tidak ditemukan');
       
       const expiresAt = pkg.duration_days ? new Date(Date.now() + pkg.duration_days * 86400000).toISOString() : null;
       const id = crypto.randomUUID();
       // Add to user memberships
       db.prepare('INSERT INTO user_memberships (id, tenant_id, user_id, package_id, sessions_remaining, days_remaining, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
         id, req.user.tenant_id, user_id, package_id, pkg.max_sessions, pkg.duration_days, expiresAt
       );
       
       // Record payment
       const paymentId = crypto.randomUUID();
       db.prepare('INSERT INTO member_payments (id, tenant_id, user_id, package_id, amount) VALUES (?, ?, ?, ?, ?)').run(paymentId, req.user.tenant_id, user_id, package_id, pkg.price);
       return paymentId;
     });
     res.json({ id: transaction() });
  } catch(e:any) { res.status(400).json({ error: e.message }); }
});

router.post('/transactions/commission', (req: any, res) => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
   try {
      const { coach_id, amount, description } = req.body;
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO coach_commissions (id, tenant_id, coach_id, description, amount) VALUES (?, ?, ?, ?, ?)').run(id, req.user.tenant_id, coach_id, description, amount);
      res.json({ id });
   } catch(e:any) { res.status(400).json({ error: e.message }); }
});

// --- REPORTS ---
router.get('/reports/dashboard', (req: any, res) => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
   try {
     const tenantId = req.user.tenant_id;
     // Laporan penjualan (produk)
     const productSales = db.prepare('SELECT SUM(total_price) as total FROM product_sales WHERE tenant_id = ?').get(tenantId) as {total:number};
     
     // Laporan jumlah uang yang masuk dari member
     const memberIncome = db.prepare('SELECT SUM(amount) as total FROM member_payments WHERE tenant_id = ?').get(tenantId) as {total:number};
     
     // Detail Laporan Member (Balance)
     const memberBalances = db.prepare(`
       SELECT u.full_name, mp.name as package_name, um.sessions_remaining, um.days_remaining 
       FROM user_memberships um 
       JOIN users u ON um.user_id = u.id 
       JOIN membership_packages mp ON um.package_id = mp.id 
       WHERE um.tenant_id = ? AND (um.sessions_remaining > 0 OR um.days_remaining > 0)
     `).all(tenantId);
     
     // Laporan Komisi Coach
     const coachCommissions = db.prepare(`
       SELECT u.full_name, c.description, c.amount, c.date 
       FROM coach_commissions c 
       JOIN users u ON c.coach_id = u.id 
       WHERE c.tenant_id = ?
       ORDER BY c.date DESC
     `).all(tenantId);
     
     // Laporan Keuntungan = (productSales + memberIncome) - coachCommissions
     const totalCommissionsPaid = db.prepare('SELECT SUM(amount) as total FROM coach_commissions WHERE tenant_id = ?').get(tenantId) as {total:number};
     
     const totalIncome = (productSales?.total || 0) + (memberIncome?.total || 0);
     const profit = totalIncome - (totalCommissionsPaid?.total || 0);
     
     res.json({
       sales: productSales?.total || 0,
       member_income: memberIncome?.total || 0,
       profit: profit,
       member_balances: memberBalances,
       coach_commissions_history: coachCommissions,
       total_commission: totalCommissionsPaid?.total || 0
     });
   } catch(e:any) { res.status(400).json({ error: e.message }); }
});

router.get('/reports/commissions', (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'coach') return res.status(403).json({ error: 'Forbidden' });
  const coachId = req.user.role === 'coach' ? req.user.id : req.query.coachId;
  const report = CoachService.getCommissionReport(req.user.tenant_id, coachId);
  res.json(report);
});

export default router;

