
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'zenflow-secret-key';

export const AuthService = {
  login: async (email: string, password: string, tenantId: string) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND tenant_id = ?').get(email, tenantId) as any;
    if (!user) throw new Error('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: { id: user.id, full_name: user.full_name, role: user.role, tenant_id: user.tenant_id } };
  },

  register: async (data: any) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.tenant_id, data.email, hashedPassword, data.full_name, data.role || 'client');
    
    return { id };
  }
};

export const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
