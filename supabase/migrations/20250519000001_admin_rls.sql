-- Fix RLS: anon can only UPDATE licenses that are already active
-- (prevents anon from flipping pending → active themselves)

DROP POLICY IF EXISTS "anon_activate_license" ON licenses;

CREATE POLICY "anon_activate_license" ON licenses
  FOR UPDATE USING (is_active = true)
  WITH CHECK (true);
