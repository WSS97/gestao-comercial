/*
# Seed demo data for "Celular Tech Principal" (correct device)
Device ID: 748a2d33-c850-4400-b5a3-8be1b6635093

1. authorized_devices — upsert demo store with full company info
2. products — 14 products linked to the correct device
3. sales + sale_items — 10 completed sales over last 7 days
4. financial_transactions — ENTRADAS (from sales) + SAIDAS (expenses)

Idempotent: cleanup guard removes prior demo rows; ON CONFLICT DO NOTHING/UPDATE.
*/

-- 0. Cleanup previous demo seed for this device (re-runnable)
DO $$
DECLARE
  demo_id UUID := '748a2d33-c850-4400-b5a3-8be1b6635093';
BEGIN
  DELETE FROM public.sale_items
    WHERE sale_id IN (SELECT id FROM public.sales WHERE device_id = demo_id);
  DELETE FROM public.sales WHERE device_id = demo_id;
  DELETE FROM public.financial_transactions WHERE device_id = demo_id;
  DELETE FROM public.products WHERE device_id = demo_id;
END $$;

-- 1. authorized_devices — upsert demo store with full company info
INSERT INTO public.authorized_devices (
  id, device_name, access_code, is_active,
  company_cnpj, company_phone, company_email, company_address, company_logo_url,
  senha_admin
) VALUES (
  '748a2d33-c850-4400-b5a3-8be1b6635093',
  'Celular Tech Principal',
  'HESC-CT2026-X98A',
  true,
  '55.100.514/0001-87',
  '71 9 8888-8888',
  'atendimento@tech.com',
  'Nereu Ramos,55, Jaragua do Sul',
  NULL,
  '1111'
)
ON CONFLICT (id) DO UPDATE SET
  device_name       = EXCLUDED.device_name,
  access_code       = EXCLUDED.access_code,
  is_active         = EXCLUDED.is_active,
  company_cnpj      = EXCLUDED.company_cnpj,
  company_phone     = EXCLUDED.company_phone,
  company_email     = EXCLUDED.company_email,
  company_address   = EXCLUDED.company_address,
  company_logo_url  = EXCLUDED.company_logo_url,
  senha_admin       = EXCLUDED.senha_admin;

-- 2. products — seed catalog linked to correct device
INSERT INTO public.products (device_id, name, price, cost_price, stock, category, code)
VALUES
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Película 3D iPhone 15',          39.90,  12.00,  60, 'Acessórios', 'PLC-3D-IP15'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Capa Anti-impacto Samsung S24',  89.90,  35.00,  25, 'Acessórios', 'CAP-AI-S24'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Carregador Rápido Type-C 67W',  129.90,  58.00,  18, 'Acessórios', 'CRG-TC-67W'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Cabo Lightning 1m Original',     24.90,   9.50,  40, 'Acessórios', 'CAB-LT-1M'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Display Frontal Moto G8',       349.00, 210.00,   7, 'Peças',      'DSP-MG8'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Bateria iPhone X',              189.00,  95.00,  12, 'Peças',      'BAT-IPX'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Limpeza de Conector',            49.90,  10.00,  50, 'Serviços',   'SRV-LIMP-CON'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Fone Bluetooth TWS Pro',        199.90,  85.00,  20, 'Áudio',      'FONE-TWS-PRO'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Power Bank 20000mAh',           159.90,  72.00,  15, 'Acessórios', 'PB-20K'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Película Hidrogel Universal',    29.90,   8.00,  80, 'Acessórios', 'PLC-HG-UNI'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Troca de Tela iPhone 11',       599.00, 380.00,   5, 'Serviços',   'SRV-TELA-IP11'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Caixa de Som Portátil BT',      299.90, 140.00,  10, 'Áudio',      'CAIXA-BT'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Suporte Veicular Magnético',     69.90,  28.00,  30, 'Acessórios', 'SUP-VEIC-MAG'),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'Adesivo 3M para Colagem de Tela',19.90,   6.00, 100, 'Peças',     'ADE-3M-Tela')
ON CONFLICT DO NOTHING;

-- 3. sales — 10 completed sales over last 7 days
INSERT INTO public.sales (
  id, device_id, subtotal, discount_type, discount_value, additional_amount,
  total_amount, payment_method, notes, status, created_at,
  customer_name, customer_phone
)
SELECT
  sale.id::uuid,
  '748a2d33-c850-4400-b5a3-8be1b6635093',
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
    ('22222222-0000-0000-0000-000000000001',  89.80, 'fixed', 0.00,  89.80, 'PIX',            'Cliente retirou na loja',             (now() - interval '6 days' - interval '2 hours'), 'Maria Silva',     '71 9 8888-1111'),
    ('22222222-0000-0000-0000-000000000002', 199.80, 'fixed', 0.00, 199.80, 'CARTAO_CREDITO', 'Fone + película combo',               (now() - interval '6 days' - interval '5 hours'), 'João Santos',     '71 9 7777-2222'),
    ('22222222-0000-0000-0000-000000000003', 349.00, 'fixed', 0.00, 349.00, 'DINHEIRO',       'Display frontal - orçamento aprovado',(now() - interval '5 days' - interval '3 hours'), 'Carlos Oliveira', '71 9 6666-3333'),
    ('22222222-0000-0000-0000-000000000004',  49.90, 'fixed', 0.00,  49.90, 'PIX',            'Limpeza de conector',                  (now() - interval '5 days' - interval '1 hours'), 'Ana Costa',       '71 9 5555-4444'),
    ('22222222-0000-0000-0000-000000000005', 189.00, 'fixed', 0.00, 189.00, 'CARTAO_DEBITO',  'Bateria iPhone X',                     (now() - interval '4 days' - interval '4 hours'), 'Pedro Almeida',   '71 9 4444-5555'),
    ('22222222-0000-0000-0000-000000000006', 289.70, 'fixed',10.00, 279.70, 'PIX',            'Capa + carregador + cabo',             (now() - interval '4 days' - interval '6 hours'), 'Juliana Souza',   '71 9 3333-6666'),
    ('22222222-0000-0000-0000-000000000007', 599.00, 'fixed', 0.00, 599.00, 'CARTAO_CREDITO','Troca de tela iPhone 11',              (now() - interval '3 days' - interval '2 hours'), 'Ricardo Lima',    '71 9 2222-7777'),
    ('22222222-0000-0000-0000-000000000008',  59.80, 'fixed', 0.00,  59.80, 'DINHEIRO',       '2x película hidrogel',                 (now() - interval '3 days' - interval '5 hours'), 'Fernanda Rocha',  '71 9 1111-8888'),
    ('22222222-0000-0000-0000-000000000009', 159.90, 'fixed', 0.00, 159.90, 'PIX',            'Power Bank 20000mAh',                  (now() - interval '1 days' - interval '3 hours'), 'Bruno Carvalho',  '71 9 9999-0000'),
    ('22222222-0000-0000-0000-000000000010', 369.80, 'fixed', 0.00, 369.80, 'CARTAO_CREDITO','Caixa de som + suporte veicular',      (now() - interval '2 hours'),                      'Patrícia Mendes',  '71 9 8800-1212')
) AS sale(
  id, subtotal, discount_type, discount_value, total,
  payment_method, notes, created_at, customer_name, customer_phone
)
ON CONFLICT (id) DO NOTHING;

-- 3b. sale_items — link products to each sale
INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
SELECT s.id, p.id, p.name, si.qty::int, p.price, p.price * si.qty::int
FROM public.sales s
JOIN public.products p ON p.device_id = '748a2d33-c850-4400-b5a3-8be1b6635093'
JOIN (
  VALUES
    ('22222222-0000-0000-0000-000000000001', 'Película 3D iPhone 15', 2),
    ('22222222-0000-0000-0000-000000000002', 'Fone Bluetooth TWS Pro', 1),
    ('22222222-0000-0000-0000-000000000002', 'Película Hidrogel Universal', 1),
    ('22222222-0000-0000-0000-000000000003', 'Display Frontal Moto G8', 1),
    ('22222222-0000-0000-0000-000000000004', 'Limpeza de Conector', 1),
    ('22222222-0000-0000-0000-000000000005', 'Bateria iPhone X', 1),
    ('22222222-0000-0000-0000-000000000006', 'Capa Anti-impacto Samsung S24', 1),
    ('22222222-0000-0000-0000-000000000006', 'Carregador Rápido Type-C 67W', 1),
    ('22222222-0000-0000-0000-000000000006', 'Cabo Lightning 1m Original', 1),
    ('22222222-0000-0000-0000-000000000007', 'Troca de Tela iPhone 11', 1),
    ('22222222-0000-0000-0000-000000000008', 'Película Hidrogel Universal', 2),
    ('22222222-0000-0000-0000-000000000009', 'Power Bank 20000mAh', 1),
    ('22222222-0000-0000-0000-000000000010', 'Caixa de Som Portátil BT', 1),
    ('22222222-0000-0000-0000-000000000010', 'Suporte Veicular Magnético', 1)
) AS si(sale_id, product_name, qty) ON si.sale_id::uuid = s.id AND si.product_name = p.name
WHERE s.device_id = '748a2d33-c850-4400-b5a3-8be1b6635093'
ON CONFLICT DO NOTHING;

-- 4. financial_transactions — ENTRADAS + SAIDAS

-- 4a. ENTRADA: one per completed sale
INSERT INTO public.financial_transactions (device_id, type, amount, description, category, transaction_date)
SELECT
  '748a2d33-c850-4400-b5a3-8be1b6635093',
  'ENTRADA',
  s.total_amount,
  'Venda #' || upper(left(s.id::text, 8)) || ' — ' || COALESCE(s.customer_name, 'Cliente'),
  'Aporte Inicial',
  s.created_at::date
FROM public.sales s
WHERE s.device_id = '748a2d33-c850-4400-b5a3-8be1b6635093'
  AND s.status = 'COMPLETED'
ON CONFLICT DO NOTHING;

-- 4b. SAIDA: shop expenses spread across the last 7 days
INSERT INTO public.financial_transactions (device_id, type, amount, description, category, transaction_date)
VALUES
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA', 420.00, 'Compra de peças — Display e baterias',          'Peças/Insumos',          (now() - interval '6 days')::date),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA', 185.50, 'Conta de luz — Loja',                           'Estrutura/Custos Fixos', (now() - interval '5 days')::date),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA',  95.00, 'Embalagens e plástico bolha (lote)',            'Peças/Insumos',          (now() - interval '4 days')::date),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA', 150.00, 'Anúncio Instagram — Patrocínio',               'Marketing/Anúncios',     (now() - interval '3 days')::date),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA', 280.00, 'Compra de acessórios — Capas e carregadores',   'Peças/Insumos',          (now() - interval '2 days')::date),
  ('748a2d33-c850-4400-b5a3-8be1b6635093', 'SAIDA', 200.00, 'Pró-labore — Sócio',                            'Pessoal/Pró-labore',     (now() - interval '1 days')::date)
ON CONFLICT DO NOTHING;