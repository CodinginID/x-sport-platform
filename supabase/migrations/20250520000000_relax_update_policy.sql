-- Allow anon to update any license row (approve pending included)
DROP POLICY IF EXISTS "anon_activate_license" ON licenses;

CREATE POLICY "anon_activate_license" ON licenses
  FOR UPDATE USING (true)
  WITH CHECK (true);
