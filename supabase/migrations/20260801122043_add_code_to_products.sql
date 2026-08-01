/*
# Add product code column

1. Modified Tables
- `public.products`
  - Add `code` (text, nullable) — product code/SKU for search and identification

2. Security
- No policy changes. RLS already enabled on products.

3. Notes
- Idempotent: uses IF NOT EXISTS guard.
- Nullable so existing products remain valid.
*/

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code TEXT;
