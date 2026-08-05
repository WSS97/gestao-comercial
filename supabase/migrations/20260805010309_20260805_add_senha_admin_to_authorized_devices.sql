/*
# Add senha_admin column to authorized_devices

1. Modified Tables
- `public.authorized_devices`
  - Add `senha_admin` (TEXT, nullable) — admin password used to gate access
    to the Dashboard and Financeiro views. When NULL or empty string, those
    views are freely accessible. When set, a password prompt is shown.

2. Security
- No policy changes. The existing SELECT policy for anon/authenticated on
  authorized_devices already exposes active rows, which is required so the
  frontend can read senha_admin for the lock check.

3. Notes
- Idempotent via DO block / information_schema check.
- Nullable on purpose: NULL means "no admin password set" = free access.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'senha_admin'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN senha_admin TEXT;
  END IF;
END $$;
