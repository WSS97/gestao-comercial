/*
# Seed demo data for "Smart Assistência Técnica e Acessorios"
Idempotent: cleanup guard removes prior demo rows; upserts/ON CONFLICT DO NOTHING.
*/

-- 0. Cleanup previous demo seed (re-runnable)
DO $$
DECLARE
  demo_id UUID := '2101ff0e-534c-4df8-ac4e-8fa5f1598ede';
BEGIN
  DELETE FROM public.sale_items
    WHERE sale_id IN (SELECT id FROM public.sales WHERE device_id = demo_id);
  DELETE FROM public.sales WHERE device_id = demo_id;
  DELETE FROM public.financial_transactions WHERE device_id = demo_id;
  DELETE FROM public.products WHERE device_id = demo_id;
END $$;

-- 1. authorized_devices — upsert demo store
INSERT INTO public.authorized_devices (
  id, device_name, access_code, is_active,
  company_phone, company_address, senha_admin
) VALUES (
  '2101ff0e-534c-4df8-ac4e-8fa5f1598ede',
  'Smart Assistência Técnica e Acessorios',
  'HESC-CT2026-S74A',
  true,
  '71 9 8722-5382',
  'Cia 1',
  'Nemtente1'
)
ON CONFLICT (id) DO UPDATE SET
  device_name     = EXCLUDED.device_name,
  access_code     = EXCLUDED.access_code,
  is_active       = EXCLUDED.is_active,
  company_phone   = EXCLUDED.company_phone,
  company_address = EXCLUDED.company_address,
  senha_admin     = EXCLUDED.senha_admin;

-- 2. products — add cost_price column + seed catalog
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

INSERT INTO public.products (device_id, name, price, cost_price, stock, category, code)
VALUES
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Película 3D iPhone 15',          39.90,  12.00,  60, 'Acessórios', 'PLC-3D-IP15'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Capa Anti-impacto Samsung S24',  89.90,  35.00,  25, 'Acessórios', 'CAP-AI-S24'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Carregador Rápido Type-C 67W',  129.90,  58.00,  18, 'Acessórios', 'CRG-TC-67W'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Cabo Lightning 1m Original',     24.90,   9.50,  40, 'Acessórios', 'CAB-LT-1M'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Display Frontal Moto G8',       349.00, 210.00,   7, 'Peças',      'DSP-MG8'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Bateria iPhone X',              189.00,  95.00,  12, 'Peças',      'BAT-IPX'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Limpeza de Conector',            49.90,  10.00,  50, 'Serviços',   'SRV-LIMP-CON'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Fone Bluetooth TWS Pro',        199.90,  85.00,  20, 'Áudio',      'FONE-TWS-PRO'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Power Bank 20000mAh',           159.90,  72.00,  15, 'Acessórios', 'PB-20K'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Película Hidrogel Universal',    29.90,   8.00,  80, 'Acessórios', 'PLC-HG-UNI'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Troca de Tela iPhone 11',       599.00, 380.00,   5, 'Serviços',   'SRV-TELA-IP11'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Caixa de Som Portátil BT',      299.90, 140.00,  10, 'Áudio',      'CAIXA-BT'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Suporte Veicular Magnético',     69.90,  28.00,  30, 'Acessórios', 'SUP-VEIC-MAG'),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'Adesivo 3M para Colagem de Tela',19.90,   6.00, 100, 'Peças',     'ADE-3M-Tela')
ON CONFLICT DO NOTHING;

-- 3. sales — 10 completed sales over last 7 days
INSERT INTO public.sales (
  id, device_id, subtotal, discount_type, discount_value, additional_amount,
  total_amount, payment_method, notes, status, created_at,
  customer_name, customer_phone
)
SELECT
  sale.id::uuid,
  '2101ff0e-534c-4df8-ac4e-8fa5f1598ede',
  sale.subtotal::numeric,
  sale.discount_type,
  sale.discount_value::numeric,
  0,
  sale.total::numeric,
  sale.payment_method,
  sale.notes,
  'COMPLETED',
  sale.created_at::timestamptz,
  sale.customer_name,
  sale.customer_phone
FROM (
  VALUES
    ('11111111-0000-0000-0000-000000000001',  89.80, 'fixed', 0.00,  89.80, 'PIX',            'Cliente retirou na loja',             (now() - interval '6 days' - interval '2 hours'), 'Maria Silva',     '71 9 8888-1111'),
    ('11111111-0000-0000-0000-000000000002', 199.80, 'fixed', 0.00, 199.80, 'CARTAO_CREDITO', 'Fone + película combo',               (now() - interval '6 days' - interval '5 hours'), 'João Santos',     '71 9 7777-2222'),
    ('11111111-0000-0000-0000-000000000003', 349.00, 'fixed', 0.00, 349.00, 'DINHEIRO',       'Display frontal - orçamento aprovado',(now() - interval '5 days' - interval '3 hours'), 'Carlos Oliveira', '71 9 6666-3333'),
    ('11111111-0000-0000-0000-000000000004',  49.90, 'fixed', 0.00,  49.90, 'PIX',            'Limpeza de conector',                  (now() - interval '5 days' - interval '1 hours'), 'Ana Costa',       '71 9 5555-4444'),
    ('11111111-0000-0000-0000-000000000005', 189.00, 'fixed', 0.00, 189.00, 'CARTAO_DEBITO',  'Bateria iPhone X',                     (now() - interval '4 days' - interval '4 hours'), 'Pedro Almeida',   '71 9 4444-5555'),
    ('11111111-0000-0000-0000-000000000006', 289.70, 'fixed',10.00, 279.70, 'PIX',            'Capa + carregador + cabo',             (now() - interval '4 days' - interval '6 hours'), 'Juliana Souza',   '71 9 3333-6666'),
    ('11111111-0000-0000-0000-000000000007', 599.00, 'fixed', 0.00, 599.00, 'CARTAO_CREDITO','Troca de tela iPhone 11',              (now() - interval '3 days' - interval '2 hours'), 'Ricardo Lima',    '71 9 2222-7777'),
    ('11111111-0000-0000-0000-000000000008',  59.80, 'fixed', 0.00,  59.80, 'DINHEIRO',       '2x película hidrogel',                 (now() - interval '3 days' - interval '5 hours'), 'Fernanda Rocha',  '71 9 1111-8888'),
    ('11111111-0000-0000-0000-000000000009', 159.90, 'fixed', 0.00, 159.90, 'PIX',            'Power Bank 20000mAh',                  (now() - interval '1 days' - interval '3 hours'), 'Bruno Carvalho',  '71 9 9999-0000'),
    ('11111111-0000-0000-0000-000000000010', 369.80, 'fixed', 0.00, 369.80, 'CARTAO_CREDITO','Caixa de som + suporte veicular',      (now() - interval '2 hours'),                      'Patrícia Mendes',  '71 9 8800-1212')
) AS sale(
  id, subtotal, discount_type, discount_value, total,
  payment_method, notes, created_at, customer_name, customer_phone
)
ON CONFLICT (id) DO NOTHING;

-- 3b. sale_items — link products to each sale
INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
SELECT s.id, p.id, p.name, si.qty::int, p.price, p.price * si.qty::int
FROM public.sales s
JOIN public.products p ON p.device_id = '2101ff0e-534c-4df8-ac4e-8fa5f1598ede'
JOIN (
  VALUES
    ('11111111-0000-0000-0000-000000000001', 'Película 3D iPhone 15', 2),
    ('11111111-0000-0000-0000-000000000002', 'Fone Bluetooth TWS Pro', 1),
    ('11111111-0000-0000-0000-000000000002', 'Película Hidrogel Universal', 1),
    ('11111111-0000-0000-0000-000000000003', 'Display Frontal Moto G8', 1),
    ('11111111-0000-0000-0000-000000000004', 'Limpeza de Conector', 1),
    ('11111111-0000-0000-0000-000000000005', 'Bateria iPhone X', 1),
    ('11111111-0000-0000-0000-000000000006', 'Capa Anti-impacto Samsung S24', 1),
    ('11111111-0000-0000-0000-000000000006', 'Carregador Rápido Type-C 67W', 1),
    ('11111111-0000-0000-0000-000000000006', 'Cabo Lightning 1m Original', 1),
    ('11111111-0000-0000-0000-000000000007', 'Troca de Tela iPhone 11', 1),
    ('11111111-0000-0000-0000-000000000008', 'Película Hidrogel Universal', 2),
    ('11111111-0000-0000-0000-000000000009', 'Power Bank 20000mAh', 1),
    ('11111111-0000-0000-0000-000000000010', 'Caixa de Som Portátil BT', 1),
    ('11111111-0000-0000-0000-000000000010', 'Suporte Veicular Magnético', 1)
) AS si(sale_id, product_name, qty) ON si.sale_id::uuid = s.id AND si.product_name = p.name
WHERE s.device_id = '2101ff0e-534c-4df8-ac4e-8fa5f1598ede'
ON CONFLICT DO NOTHING;

-- 4. financial_transactions — ENTRADAS + SAIDAS

-- 4a. ENTRADA: one per completed sale
INSERT INTO public.financial_transactions (device_id, type, amount, description, category, transaction_date)
SELECT
  '2101ff0e-534c-4df8-ac4e-8fa5f1598ede',
  'ENTRADA',
  s.total_amount,
  'Venda #' || upper(left(s.id::text, 8)) || ' — ' || COALESCE(s.customer_name, 'Cliente'),
  'Aporte Inicial',
  s.created_at::date
FROM public.sales s
WHERE s.device_id = '2101ff0e-534c-4df8-ac4e-8fa5f1598ede'
  AND s.status = 'COMPLETED'
ON CONFLICT DO NOTHING;

-- 4b. SAIDA: shop expenses spread across the last 7 days
INSERT INTO public.financial_transactions (device_id, type, amount, description, category, transaction_date)
VALUES
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA', 420.00, 'Compra de peças — Display e baterias',          'Peças/Insumos',          (now() - interval '6 days')::date),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA', 185.50, 'Conta de luz — Loja',                           'Estrutura/Custos Fixos', (now() - interval '5 days')::date),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA',  95.00, 'Embalagens e plástico bolha (lote)',            'Peças/Insumos',          (now() - interval '4 days')::date),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA', 150.00, 'Anúncio Instagram — Patrocínio',               'Marketing/Anúncios',     (now() - interval '3 days')::date),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA', 280.00, 'Compra de acessórios — Capas e carregadores',   'Peças/Insumos',          (now() - interval '2 days')::date),
  ('2101ff0e-534c-4df8-ac4e-8fa5f1598ede', 'SAIDA', 200.00, 'Pró-labore — Sócio',                            'Pessoal/Pró-labore',     (now() - interval '1 days')::date)
ON CONFLICT DO NOTHING;