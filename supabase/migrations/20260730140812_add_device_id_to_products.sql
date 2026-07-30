/*
# Add device_id foreign key to products

1. Modified Tables
- `public.products`
  - Add `device_id` (uuid, nullable) — links a product to the authorized_devices
    row of the device that created it. Nullable so existing seed/legacy rows
    remain valid; new products inserted by a device carry that device's id.
  - Add foreign key constraint `products_device_id_fkey` referencing
    `authorized_devices(id)` ON DELETE SET NULL (don't lose the product if a
    device is removed; just unassign it).
  - Add index `products_device_id_idx` on device_id for fast per-device
    filtering.

2. Security
- No policy changes. RLS already enabled on products with anon+authenticated
  full CRUD. Per-device scoping is handled in the application layer via query
  filters (device_id eq current OR device_id is null for shared seed data).

3. Notes
- Idempotent: column, constraint, and index use IF NOT EXISTS guards.
- No destructive operations — existing data is preserved.
- Existing seed products keep device_id = NULL and remain visible to all
  devices (shared catalog). Products created by a specific device are only
  visible to that device.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN device_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_device_id_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_device_id_fkey
      FOREIGN KEY (device_id) REFERENCES public.authorized_devices(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_device_id_idx ON public.products (device_id);
