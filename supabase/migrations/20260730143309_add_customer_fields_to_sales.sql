/*
# Add customer fields to sales table

1. Modified Tables
- `public.sales`
  - Add `customer_name` (text, nullable) — customer name for the sale
  - Add `customer_phone` (text, nullable) — customer phone
  - Add `customer_document` (text, nullable) — customer CPF/CNPJ
  - Add `customer_email` (text, nullable) — customer email
  - Add `customer_address` (text, nullable) — customer address

2. Security
- No policy changes. RLS already enabled on sales with anon+authenticated
  full CRUD. New columns are nullable so existing rows remain valid.

3. Notes
- Idempotent: columns use IF NOT EXISTS guards.
- No destructive operations — existing data is preserved.
*/

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_document TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_address TEXT;
