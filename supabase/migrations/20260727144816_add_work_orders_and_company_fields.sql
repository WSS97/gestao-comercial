/*
# Work Orders + Company info + additional_amount

1. sales table
- Add `additional_amount` DECIMAL(10,2) DEFAULT 0 — extra fee/charge on a sale.

2. authorized_devices table
- Add `company_cnpj` TEXT
- Add `company_phone` TEXT
- Add `company_email` TEXT
- Add `company_address` TEXT
- Add `company_logo_url` TEXT
These store the shop's identity used on printed receipts/warranty terms.

3. New table: work_orders
- id (uuid pk)
- device_id (fk authorized_devices)
- order_number (serial)
- customer_name, customer_phone, customer_document
- equipment_model, equipment_imei, defect_notes
- items_json (jsonb array of {name, qty, unit_price, subtotal})
- subtotal, discount_type, discount_value, total_amount
- warranty_terms
- status (PENDENTE | EM_ANDAMENTO | CONCLUIDO | CANCELADO)
- created_at

4. Security
- Enable RLS on work_orders.
- Single-tenant app (localStorage device auth, no Supabase sign-in):
  allow anon + authenticated full CRUD via 4 separate policies.

5. Notes
- All statements idempotent (IF NOT EXISTS / DO blocks).
- Policies dropped before recreate to stay re-runnable.
*/

-- 1. additional_amount on sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'additional_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN additional_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 2. company fields on authorized_devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'company_cnpj'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN company_cnpj TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'company_phone'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN company_phone TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'company_email'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN company_email TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN company_address TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'authorized_devices' AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE public.authorized_devices ADD COLUMN company_logo_url TEXT;
  END IF;
END $$;

-- 3. work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.authorized_devices(id),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_document TEXT,
  equipment_model TEXT,
  equipment_imei TEXT,
  defect_notes TEXT,
  items_json JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  discount_value DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  warranty_terms TEXT,
  status TEXT DEFAULT 'CONCLUIDO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (single-tenant: anon + authenticated)
DROP POLICY IF EXISTS "wo_select_all" ON public.work_orders;
CREATE POLICY "wo_select_all" ON public.work_orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wo_insert_all" ON public.work_orders;
CREATE POLICY "wo_insert_all" ON public.work_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wo_update_all" ON public.work_orders;
CREATE POLICY "wo_update_all" ON public.work_orders
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wo_delete_all" ON public.work_orders;
CREATE POLICY "wo_delete_all" ON public.work_orders
  FOR DELETE TO anon, authenticated USING (true);
