/*
# Create financial_transactions table (Financeiro module)

1. New Tables
- `public.financial_transactions`
  - `id` (uuid, primary key, auto-generated)
  - `device_id` (uuid, references authorized_devices) — device that recorded the transaction
  - `type` (text, not null) — 'ENTRADA' (Aporte) or 'SAIDA' (Despesa)
  - `amount` (numeric(10,2), not null) — value of the transaction in BRL
  - `description` (text, not null) — description of the movement
  - `category` (text, not null) — 'Peças/Insumos', 'Estrutura/Custos Fixos',
    'Pessoal/Pró-labore', 'Marketing/Anúncios', 'Aporte Inicial', 'Outros'
  - `transaction_date` (date, not null) — date the movement occurred
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `financial_transactions`.
- This is a no-auth app (device activation via localStorage), so the anon-key
  client must read/write. Four separate policies (SELECT/INSERT/UPDATE/DELETE)
  scoped to `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared across the single activated device.

3. Indexes
- Index on `device_id` for device-scoped queries.
- Index on `transaction_date` for date-range filtering.
*/

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.authorized_devices(id),
  type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_financial_transactions" ON public.financial_transactions;
CREATE POLICY "anon_select_financial_transactions" ON public.financial_transactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_financial_transactions" ON public.financial_transactions;
CREATE POLICY "anon_insert_financial_transactions" ON public.financial_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_financial_transactions" ON public.financial_transactions;
CREATE POLICY "anon_update_financial_transactions" ON public.financial_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_financial_transactions" ON public.financial_transactions;
CREATE POLICY "anon_delete_financial_transactions" ON public.financial_transactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_device_id ON public.financial_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date);
