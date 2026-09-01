/*
# Add is_read_only column to authorized_devices

1. Modified Tables
- `public.authorized_devices`
  - Add `is_read_only` (BOOLEAN, default FALSE) — when TRUE, the device
    is in "read-only / inadimplente" mode: navigation is allowed but all
    write operations (sales, stock edits, financial transactions) are blocked.

2. Security
- No policy changes. The existing SELECT policy already exposes active rows.

3. Notes
- Idempotent via DO block / information_schema check.
- Default FALSE means existing devices keep normal read-write behavior.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'is_read_only'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN is_read_only BOOLEAN DEFAULT FALSE;
  END IF;
END $$;