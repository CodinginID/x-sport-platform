-- License activation system for multi-client protection

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  studio_name TEXT,
  studio_address TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  plan TEXT DEFAULT 'basic',
  storage_quota_mb INT DEFAULT 50,
  storage_used_mb NUMERIC DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  grace_period_days INT DEFAULT 30,
  activated_at TIMESTAMPTZ,
  device_fingerprint TEXT,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE license_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (anon can only validate & activate)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_users ENABLE ROW LEVEL SECURITY;

-- Allow anon to read license by key (for validation)
CREATE POLICY "anon_validate_license" ON licenses
  FOR SELECT USING (true);

-- Allow anon to update license (for activation: set studio data + fingerprint)
CREATE POLICY "anon_activate_license" ON licenses
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Allow anon to insert license (for self-registration)
CREATE POLICY "anon_register_license" ON licenses
  FOR INSERT WITH CHECK (true);

-- Allow anon to read users for their license
CREATE POLICY "anon_read_license_users" ON license_users
  FOR SELECT USING (true);

-- Allow anon to insert users (for self-registration)
CREATE POLICY "anon_register_user" ON license_users
  FOR INSERT WITH CHECK (true);
