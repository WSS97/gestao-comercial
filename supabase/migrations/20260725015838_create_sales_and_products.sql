/*
# Create products, sales, and sale_items tables (PDV / point of sale)

1. New Tables
- `public.products`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — product name shown in the PDV grid
  - `price` (numeric(10,2), not null) — unit sale price
  - `stock` (integer, not null, default 0) — quantity on hand
  - `category` (text, default 'Geral') — product category for filtering
  - `created_at` (timestamptz, default now())
- `public.sales`
  - `id` (uuid, primary key, auto-generated)
  - `device_id` (uuid, references authorized_devices) — device that made the sale
  - `subtotal` (numeric(10,2), not null) — sum of items before discount
  - `discount_type` (text, default 'fixed') — 'fixed' ($) or 'percentage' (%)
  - `discount_value` (numeric(10,2), default 0) — discount amount
  - `total_amount` (numeric(10,2), not null) — final total after discount
  - `payment_method` (text, not null) — 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'
  - `notes` (text, nullable) — optional sale notes
  - `status` (text, default 'COMPLETED')
  - `created_at` (timestamptz, default now())
- `public.sale_items`
  - `id` (uuid, primary key, auto-generated)
  - `sale_id` (uuid, references sales ON DELETE CASCADE)
  - `product_id` (uuid, references products)
  - `product_name` (text, not null) — snapshot of name at sale time
  - `quantity` (integer, not null)
  - `unit_price` (numeric(10,2), not null) — snapshot of price at sale time
  - `subtotal` (numeric(10,2), not null) — quantity * unit_price
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on all three tables.
- This is a no-auth app (device activation via localStorage device_token, not
  Supabase auth), so the anon-key client must be able to read/write. Each table
  gets 4 separate policies (SELECT/INSERT/UPDATE/DELETE) scoped to
  `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the
  data is intentionally shared across the single activated device.

3. Seed
- Insert a starter catalog of phone/tech products for the PDV grid.

4. Important Notes
- The user's original SQL used `FOR ALL` policies; per the database rules we
  split into 4 per-verb policies instead, achieving the same open access safely.
- `product_name`, `unit_price` are snapshotted on sale_items so historical
  sales remain accurate even if a product is later renamed or repriced.
*/

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON public.products;
CREATE POLICY "anon_select_products" ON public.products FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON public.products;
CREATE POLICY "anon_insert_products" ON public.products FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON public.products;
CREATE POLICY "anon_update_products" ON public.products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON public.products;
CREATE POLICY "anon_delete_products" ON public.products FOR DELETE
  TO anon, authenticated USING (true);

-- Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.authorized_devices(id),
  subtotal DECIMAL(10,2) NOT NULL,
  discount_type TEXT DEFAULT 'fixed',
  discount_value DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sales" ON public.sales;
CREATE POLICY "anon_select_sales" ON public.sales FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sales" ON public.sales;
CREATE POLICY "anon_insert_sales" ON public.sales FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sales" ON public.sales;
CREATE POLICY "anon_update_sales" ON public.sales FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sales" ON public.sales;
CREATE POLICY "anon_delete_sales" ON public.sales FOR DELETE
  TO anon, authenticated USING (true);

-- Sale items
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sale_items" ON public.sale_items;
CREATE POLICY "anon_select_sale_items" ON public.sale_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sale_items" ON public.sale_items;
CREATE POLICY "anon_insert_sale_items" ON public.sale_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sale_items" ON public.sale_items;
CREATE POLICY "anon_update_sale_items" ON public.sale_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sale_items" ON public.sale_items;
CREATE POLICY "anon_delete_sale_items" ON public.sale_items FOR DELETE
  TO anon, authenticated USING (true);

-- Seed catalog
INSERT INTO public.products (name, price, stock, category) VALUES
  ('iPhone 15 Pro 128GB', 7999.00, 12, 'Smartphones'),
  ('iPhone 15 256GB', 6499.00, 8, 'Smartphones'),
  ('Samsung Galaxy S24', 5999.00, 15, 'Smartphones'),
  ('Xiaomi Redmi Note 13', 1499.00, 30, 'Smartphones'),
  ('Capa Silicone iPhone 15', 89.90, 50, 'Acessórios'),
  ('Película Protetora 3D', 39.90, 100, 'Acessórios'),
  ('Carregador Turbo 67W', 129.90, 40, 'Acessórios'),
  ('Fone Bluetooth TWS', 199.90, 25, 'Áudio'),
  ('Caixa de Som Portátil', 299.90, 18, 'Áudio'),
  ('Power Bank 20000mAh', 159.90, 22, 'Acessórios'),
  ('Cabo USB-C 1m', 24.90, 80, 'Acessórios'),
  ('Suporte Veicular Magnético', 69.90, 35, 'Acessórios')
ON CONFLICT DO NOTHING;
