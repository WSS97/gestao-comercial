/* Dynamic product categories */

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON public.categories (lower(name));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON public.categories;
CREATE POLICY "anon_select_categories" ON public.categories FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON public.categories;
CREATE POLICY "anon_insert_categories" ON public.categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON public.categories;
CREATE POLICY "anon_update_categories" ON public.categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON public.categories;
CREATE POLICY "anon_delete_categories" ON public.categories FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO public.categories (name)
SELECT DISTINCT trim(category)
FROM public.products
WHERE category IS NOT NULL AND trim(category) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID;

UPDATE public.products AS products
SET category_id = categories.id
FROM public.categories AS categories
WHERE products.category_id IS NULL
  AND lower(trim(products.category)) = lower(categories.name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);