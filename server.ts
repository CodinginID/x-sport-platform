
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import helmet from 'helmet';
import db from './server/db.ts';
import { join } from 'path';
import { readFileSync } from 'fs';
import apiRouter from './server/routes/api.ts';
import bcrypt from 'bcryptjs';

async function seed() {
  const adminEmail = 'admin@zenflow.com';
  const existing = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(adminEmail) as { password_hash: string } | undefined;
  
  // If user doesn't exist OR has the placeholder hash from the old db.sql
  if (!existing || existing.password_hash.includes('YourHashedPasswordHere')) {
    console.log('Seeding/Repairing initial data...');
    if (existing) {
      db.prepare('DELETE FROM users WHERE email = ?').run(adminEmail);
    }
    
    const hash = await bcrypt.hash('admin123', 10);
    const tenantId = 't1';
    
    db.prepare('INSERT OR IGNORE INTO tenants (id, name, subdomain) VALUES (?, ?, ?)').run(tenantId, 'ZenFlow Studio', 'zenflow');
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'u-admin', tenantId, adminEmail, hash, 'System Admin', 'admin'
    );
    
    const coachId = 'u-coach';
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      coachId, tenantId, 'coach@zenflow.com', hash, 'Emma Pilates', 'coach'
    );
    
    // Add more coaches
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'u-coach2', tenantId, 'marcus@zenflow.com', hash, 'Marcus Flow', 'coach'
    );
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'u-coach3', tenantId, 'sarah@zenflow.com', hash, 'Sarah Stretch', 'coach'
    );

    // Classes
    db.prepare(`
      INSERT OR IGNORE INTO classes (id, tenant_id, coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c1', tenantId, coachId, 'Morning Flow', 'Focus on core strength.', '2026-05-15T08:00:00', '2026-05-15T09:00:00', 12, 25, 20);
    
    db.prepare(`
      INSERT OR IGNORE INTO classes (id, tenant_id, coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c2', tenantId, 'u-coach2', 'HIIT Pilates', 'High intensity interval training.', '2026-05-16T17:00:00', '2026-05-16T18:00:00', 15, 30, 25);
    
    db.prepare(`
      INSERT OR IGNORE INTO classes (id, tenant_id, coach_id, name, description, start_time, end_time, capacity, price, coach_commission_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c3', tenantId, 'u-coach3', 'Evening Stretch', 'Relax and recover.', '2026-05-16T19:00:00', '2026-05-16T20:00:00', 10, 20, 30);

    // Packages
    db.prepare(`
      INSERT OR IGNORE INTO membership_packages (id, tenant_id, name, price, max_sessions, duration_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('p1', tenantId, '10 Sessions Pack', 200, 10, 90);

    db.prepare(`
      INSERT OR IGNORE INTO membership_packages (id, tenant_id, type, name, price, max_sessions, duration_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('p2', tenantId, 'unlimited', 'Unlimited 1 Month', 500, null, 30);
    
    db.prepare(`
      INSERT OR IGNORE INTO membership_packages (id, tenant_id, type, name, price, max_sessions, duration_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('p3', tenantId, 'standard', '5 Sessions Mini', 100, 5, 45);

    // Products
    db.prepare(`
      INSERT OR IGNORE INTO products (id, tenant_id, name, stock, price)
      VALUES (?, ?, ?, ?, ?)
    `).run('prod1', tenantId, 'ZenFlow Yoga Mat', 50, 45);

    db.prepare(`
      INSERT OR IGNORE INTO products (id, tenant_id, name, stock, price)
      VALUES (?, ?, ?, ?, ?)
    `).run('prod2', tenantId, 'Grip Socks', 100, 15);
    
    db.prepare(`
      INSERT OR IGNORE INTO products (id, tenant_id, name, stock, price)
      VALUES (?, ?, ?, ?, ?)
    `).run('prod3', tenantId, 'Foam Roller', 30, 35);
    
    // Clients
    const clientId = 'u-client1';
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      clientId, tenantId, 'member@zenflow.com', hash, 'Julia Santos', 'client'
    );
    
    const client2 = 'u-client2';
    db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      client2, tenantId, 'alex@example.com', hash, 'Alex Morgan', 'client'
    );
    
    // Seed Dummy Transactions & Memberships for demo
    // User 1 buys a 10 session pack
    db.prepare('INSERT OR IGNORE INTO user_memberships (id, tenant_id, user_id, package_id, sessions_remaining, days_remaining, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'um1', tenantId, clientId, 'p1', 8, null, '2026-08-15T00:00:00'
    );
    db.prepare('INSERT OR IGNORE INTO member_payments (id, tenant_id, user_id, package_id, amount) VALUES (?, ?, ?, ?, ?)').run(
      'mp1', tenantId, clientId, 'p1', 200
    );
    
    // User 2 buys unlimited 1 month
    db.prepare('INSERT OR IGNORE INTO user_memberships (id, tenant_id, user_id, package_id, sessions_remaining, days_remaining, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'um2', tenantId, client2, 'p2', null, 25, '2026-06-15T00:00:00'
    );
    db.prepare('INSERT OR IGNORE INTO member_payments (id, tenant_id, user_id, package_id, amount) VALUES (?, ?, ?, ?, ?)').run(
      'mp2', tenantId, client2, 'p2', 500
    );
    
    // Product Sales
    db.prepare('INSERT OR IGNORE INTO product_sales (id, tenant_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?, ?)').run('ps1', tenantId, 'prod1', 1, 45);
    db.prepare('INSERT OR IGNORE INTO product_sales (id, tenant_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?, ?)').run('ps2', tenantId, 'prod2', 2, 30);
    
    // Some Bookings
    db.prepare(`INSERT OR IGNORE INTO bookings (id, tenant_id, user_id, class_id, package_id, status, commission_amount) VALUES (?, ?, ?, ?, ?, 'attended', ?)`).run(
      'b1', tenantId, clientId, 'c1', 'p1', 5 // 20% of 25 is 5
    );
    db.prepare(`INSERT OR IGNORE INTO bookings (id, tenant_id, user_id, class_id, package_id, status, commission_amount) VALUES (?, ?, ?, ?, ?, 'booked', ?)`).run(
      'b2', tenantId, clientId, 'c2', 'p1', 0
    );
    
    // Coach Commissions
    db.prepare('INSERT OR IGNORE INTO coach_commissions (id, tenant_id, coach_id, description, amount) VALUES (?, ?, ?, ?, ?)').run('cc1', tenantId, coachId, 'Commission class Morning Flow', 5);

  }
}

async function startServer() {
  await seed();
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(helmet({
    contentSecurityPolicy: false, // Disable for dev, re-enable for prod
  }));
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api', apiRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // Auth routes, Booking routes, etc will be added here
  
  // Vite Integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    // In dev, use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
