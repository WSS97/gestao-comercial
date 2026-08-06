-- Allow anon/authenticated to UPDATE rows on authorized_devices
-- (needed so the app can persist senha_admin per device)
CREATE POLICY "anon_update_authorized_devices"
  ON authorized_devices
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow INSERT so new devices can be registered
CREATE POLICY "anon_insert_authorized_devices"
  ON authorized_devices
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow DELETE for device management
CREATE POLICY "anon_delete_authorized_devices"
  ON authorized_devices
  FOR DELETE
  TO anon, authenticated
  USING (true);
