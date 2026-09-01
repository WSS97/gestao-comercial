/*
# Add terms acceptance columns to authorized_devices

1. Modified Tables
- `public.authorized_devices`
  - Add `terms_accepted` (BOOLEAN, default FALSE)
  - Add `terms_accepted_at` (TIMESTAMPTZ, nullable)
  - Add `terms_version` (VARCHAR(20), default 'v1.0')

2. Security
- No policy changes. Existing SELECT policy already exposes active rows.

3. Notes
- Idempotent via DO block / information_schema checks.
- Default FALSE means existing devices must accept terms on next load.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN terms_accepted_at TIMESTAMPTZ NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN terms_version VARCHAR(20) DEFAULT 'v1.0';
  END IF;
END $$;