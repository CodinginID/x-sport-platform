-- RLS policies for licenses and license_users tables

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_validate_license" ON licenses;
DROP POLICY IF EXISTS "anon_activate_license" ON licenses;
DROP POLICY IF EXISTS "anon_register_license" ON licenses;
DROP POLICY IF EXISTS "anon_read_license_users" ON license_users;
DROP POLICY IF EXISTS "anon_register_user" ON license_users;

-- Allow anon to read license by key (for validation & activation)
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
