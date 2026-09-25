/* Store niche controls labels used by documentation forms. */

ALTER TABLE public.authorized_devices
  ADD COLUMN IF NOT EXISTS nicho TEXT NOT NULL DEFAULT 'eletronicos';

ALTER TABLE public.authorized_devices
  DROP CONSTRAINT IF EXISTS authorized_devices_nicho_check;

ALTER TABLE public.authorized_devices
  ADD CONSTRAINT authorized_devices_nicho_check
  CHECK (nicho IN ('eletronicos', 'auto_pecas', 'geral'));