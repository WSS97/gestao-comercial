/* Multitenant and multiniche categories. */

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS nicho TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_store_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.authorized_devices(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.categories SET nicho = 'geral' WHERE store_id IS NULL AND nicho IS NULL;

UPDATE public.categories
SET nicho = 'eletronicos'
WHERE store_id IS NULL AND name IN ('Acessórios', 'Smartphones', 'Áudio');

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_scope_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_scope_check CHECK (
  (store_id IS NULL AND nicho IS NOT NULL AND nicho IN ('auto_pecas', 'eletronicos', 'geral'))
  OR store_id IS NOT NULL
);

DROP INDEX IF EXISTS categories_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS categories_global_name_unique
  ON public.categories (nicho, lower(name)) WHERE store_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_store_name_unique
  ON public.categories (store_id, lower(name)) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS categories_store_id_idx ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS categories_nicho_idx ON public.categories(nicho);

INSERT INTO public.categories (name, nicho, store_id) VALUES
  ('Acessórios', 'eletronicos', NULL),
  ('Smartphones', 'eletronicos', NULL),
  ('Áudio e Som', 'eletronicos', NULL),
  ('Periféricos', 'eletronicos', NULL),
  ('Componentes', 'eletronicos', NULL),
  ('Motor', 'auto_pecas', NULL),
  ('Freios', 'auto_pecas', NULL),
  ('Suspensão', 'auto_pecas', NULL),
  ('Elétrica', 'auto_pecas', NULL),
  ('Filtros e Óleos', 'auto_pecas', NULL),
  ('Acessórios Automotivos', 'auto_pecas', NULL),
  ('Mão de Obra / Serviços', 'auto_pecas', NULL),
  ('Geral', 'geral', NULL),
  ('Serviços', 'geral', NULL),
  ('Diversos', 'geral', NULL)
ON CONFLICT DO NOTHING;