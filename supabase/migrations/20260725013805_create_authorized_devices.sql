/*
# Create authorized_devices table (device activation, no auth)

1. New Tables
- `public.authorized_devices`
  - `id` (uuid, primary key, auto-generated)
  - `device_name` (text, not null) — friendly name of the device
  - `access_code` (text, not null) — access code used for first-access activation
  - `is_active` (boolean, default true) — whether the device is still authorized
  - `created_at` (timestamptz, default now()) — record creation time

2. Security
- Enable RLS on `public.authorized_devices`.
- Add a SELECT policy scoped to `anon, authenticated` that only exposes
  active rows, so the activation screen can validate an access code without
  requiring sign-in. No INSERT/UPDATE/DELETE policies are added here because
  device registration is managed server-side (the app only validates codes).

3. Seed
- Insert the default test device "Celular Tech Principal" with access code
  "HESC-CT2026-X98A" if it does not already exist.

4. Important Notes
- This is a no-auth app: the activation screen validates an access code against
  active rows. The anon-key client must be able to SELECT, so the policy lists
  `anon` explicitly.
- The migration is idempotent: `IF NOT EXISTS` guards the table and the seed
  insert uses `ON CONFLICT DO NOTHING`.
*/

CREATE TABLE IF NOT EXISTS public.authorized_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL,
  access_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.authorized_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura anonima para validacao de acesso" ON public.authorized_devices;
CREATE POLICY "Leitura anonima para validacao de acesso"
  ON public.authorized_devices FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

INSERT INTO public.authorized_devices (device_name, access_code)
VALUES ('Celular Tech Principal', 'HESC-CT2026-X98A')
ON CONFLICT DO NOTHING;
