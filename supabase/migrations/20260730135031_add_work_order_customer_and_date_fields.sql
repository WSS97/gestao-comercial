/*
# Add customer detail and date fields to work_orders

1. Modified Tables
- `work_orders`
  - Add `customer_address` TEXT — endereço do cliente
  - Add `customer_email` TEXT — email do cliente
  - Add `customer_rg` TEXT — RG do cliente (separate from customer_document which holds CPF/CNPJ)
  - Add `order_date` DATE — data do pedido (collected in the form, distinct from created_at)
  - Add `delivery_date` DATE — data de entrega prevista/realizada

2. Security
- No policy changes. RLS already enabled with anon+authenticated full CRUD.
- New columns are nullable so existing rows remain valid.

3. Notes
- All additions are idempotent (IF NOT EXISTS guards).
- No destructive operations — existing data is preserved.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE public.work_orders ADD COLUMN customer_address TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE public.work_orders ADD COLUMN customer_email TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'customer_rg'
  ) THEN
    ALTER TABLE public.work_orders ADD COLUMN customer_rg TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE public.work_orders ADD COLUMN order_date DATE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE public.work_orders ADD COLUMN delivery_date DATE;
  END IF;
END $$;
