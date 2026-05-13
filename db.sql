-- Database Schema for ZenFlow Pilates Studio Management System (Multi-tenant)

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'coach', 'client')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, email)
);

-- Membership Packages Table
CREATE TABLE IF NOT EXISTS membership_packages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'standard',
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    max_sessions INTEGER, -- NULL for unlimited/duration based
    duration_days INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id)
);

-- User Memberships (Purchased Packages)
CREATE TABLE IF NOT EXISTS user_memberships (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    sessions_remaining INTEGER,
    days_remaining INTEGER,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(package_id) REFERENCES membership_packages(id)
);

-- Member Payments (Transactions)
CREATE TABLE IF NOT EXISTS member_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(package_id) REFERENCES membership_packages(id)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id)
);

-- Product Sales
CREATE TABLE IF NOT EXISTS product_sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    capacity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    coach_commission_percent DECIMAL(5, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(coach_id) REFERENCES users(id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    package_id TEXT,
    status TEXT CHECK(status IN ('booked', 'attended', 'cancelled')) DEFAULT 'booked',
    commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Calculated at booking/attendance time
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(package_id) REFERENCES membership_packages(id)
);

-- Coach Commissions (Explicit)
CREATE TABLE IF NOT EXISTS coach_commissions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    booking_id TEXT,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
    FOREIGN KEY(coach_id) REFERENCES users(id),
    FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

-- Default Tenant and Admin seed (for MVP)
-- In a real app, this would be handled by a signup flow
-- Seeding is now handled in server.ts for dynamic hashing
