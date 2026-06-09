-- Allow anon to update license_users (for staff name/password sync after edit)
DROP POLICY IF EXISTS "anon_update_license_users" ON license_users;

CREATE POLICY "anon_update_license_users" ON license_users
  FOR UPDATE USING (true) WITH CHECK (true);
