/*
# Seed work orders (Ordens de Serviço) for Celular Tech Principal
Device ID: 748a2d33-c850-4400-b5a3-8be1b6635093

5 work orders with varied statuses, items, warranty terms, and customer data.
Idempotent: cleanup guard removes prior demo work orders for this device.
*/

-- 0. Cleanup previous demo work orders (re-runnable)
DELETE FROM public.work_orders
  WHERE device_id = '748a2d33-c850-4400-b5a3-8be1b6635093';

-- 1. Insert 5 work orders
INSERT INTO public.work_orders (
  device_id, order_number, customer_name, customer_phone, customer_document,
  customer_email, customer_address, customer_rg,
  equipment_model, equipment_imei, defect_notes,
  items_json, subtotal, discount_type, discount_value, total_amount,
  warranty_terms, status, order_date, delivery_date, created_at
)
SELECT
  '748a2d33-c850-4400-b5a3-8be1b6635093',
  wo.order_number::int,
  wo.customer_name,
  wo.customer_phone,
  wo.customer_document,
  wo.customer_email,
  wo.customer_address,
  wo.customer_rg,
  wo.equipment_model,
  wo.equipment_imei,
  wo.defect_notes,
  wo.items_json::jsonb,
  wo.subtotal::numeric,
  wo.discount_type,
  wo.discount_value::numeric,
  wo.total_amount::numeric,
  wo.warranty_terms,
  wo.status,
  wo.order_date::date,
  wo.delivery_date::date,
  wo.created_at::timestamptz
FROM (
  VALUES
    (
      1,
      'Maria Silva',
      '71 9 8888-1111',
      '123.456.789-00',
      'maria.silva@email.com',
      'Rua das Flores, 123 - Centro',
      '12.345.678-9',
      'iPhone 11',
      '356789104567890',
      'Tela trincada após queda. Touch funcionando parcialmente.',
      '[{"name":"Troca de Tela iPhone 11","qty":1,"unit_price":599.00,"discount_type":"fixed","discount_value":0,"subtotal":599.00},{"name":"Película 3D iPhone 15","qty":1,"unit_price":39.90,"discount_type":"fixed","discount_value":0,"subtotal":39.90}]'::text,
      638.90, 'fixed', 0.00, 638.90,
      'Garantia de 90 dias sobre o serviço de troca de tela. A garantia não cobre danos por nova queda, água ou mau uso. Em caso de defeito no display substituído, trazer o aparelho com nota fiscal.',
      'CONCLUIDO',
      (now() - interval '5 days')::date,
      (now() - interval '3 days')::date,
      (now() - interval '5 days' - interval '2 hours')
    ),
    (
      2,
      'João Santos',
      '71 9 7777-2222',
      '987.654.321-00',
      'joao.santos@email.com',
      'Av. Brasil, 456 - Bairro Novo',
      '98.765.432-1',
      'Samsung Galaxy S24',
      '352789014567123',
      'Bateria descarregando muito rápido. Aquecimento excessivo durante uso.',
      '[{"name":"Bateria iPhone X","qty":1,"unit_price":189.00,"discount_type":"fixed","discount_value":0,"subtotal":189.00},{"name":"Limpeza de Conector","qty":1,"unit_price":49.90,"discount_type":"fixed","discount_value":0,"subtotal":49.90}]'::text,
      238.90, 'fixed', 0.00, 238.90,
      'Garantia de 90 dias sobre a bateria substituída. Não cobre danos por líquidos, quedas ou curtos-circuitos. Recomenda-se uso de carregador original.',
      'CONCLUIDO',
      (now() - interval '4 days')::date,
      (now() - interval '2 days')::date,
      (now() - interval '4 days' - interval '3 hours')
    ),
    (
      3,
      'Carlos Oliveira',
      '71 9 6666-3333',
      '456.789.123-00',
      NULL,
      NULL,
      NULL,
      'Moto G8',
      '351234567890012',
      'Display sem imagem. Aparelho liga mas tela fica preta.',
      '[{"name":"Display Frontal Moto G8","qty":1,"unit_price":349.00,"discount_type":"fixed","discount_value":0,"subtotal":349.00},{"name":"Adesivo 3M para Colagem de Tela","qty":1,"unit_price":19.90,"discount_type":"fixed","discount_value":0,"subtotal":19.90}]'::text,
      368.90, 'percentage', 10.00, 331.90,
      'Garantia de 90 dias sobre o display substituído. A garantia cobre defeitos de fabricação do componente. Não cobre quebras por impacto ou infiltração de água.',
      'EM_ANDAMENTO',
      (now() - interval '2 days')::date,
      (now() + interval '1 days')::date,
      (now() - interval '2 days' - interval '4 hours')
    ),
    (
      4,
      'Ana Costa',
      '71 9 5555-4444',
      '321.654.987-00',
      'ana.costa@email.com',
      'Rua Sete de Setembro, 789 - Centro',
      '32.165.498-7',
      'iPhone X',
      '356789012345678',
      'Conector de carga não funciona. Não carrega com cabo.',
      '[{"name":"Limpeza de Conector","qty":1,"unit_price":49.90,"discount_type":"fixed","discount_value":0,"subtotal":49.90}]'::text,
      49.90, 'fixed', 0.00, 49.90,
      'Garantia de 30 dias sobre o serviço de limpeza. Caso o problema persista, será avaliada a necessidade de troca do conector com orçamento separado.',
      'PENDENTE',
      (now() - interval '1 days')::date,
      NULL,
      (now() - interval '1 days' - interval '5 hours')
    ),
    (
      5,
      'Pedro Almeida',
      '71 9 4444-5555',
      '654.321.987-00',
      'pedro.almeida@email.com',
      'Rua XV de Novembro, 321 - Centro',
      '65.432.198-7',
      'iPhone 15 Pro',
      '359012345678901',
      'Câmera frontal com falha. Fotos saem borradas.',
      '[{"name":"Troca de Tela iPhone 11","qty":1,"unit_price":599.00,"discount_type":"fixed","discount_value":0,"subtotal":599.00},{"name":"Película Hidrogel Universal","qty":1,"unit_price":29.90,"discount_type":"fixed","discount_value":0,"subtotal":29.90},{"name":"Limpeza de Conector","qty":1,"unit_price":49.90,"discount_type":"fixed","discount_value":0,"subtotal":49.90}]'::text,
      678.80, 'fixed', 50.00, 628.80,
      'Garantia de 90 dias sobre os serviços prestados. A garantia cobre apenas defeitos relacionados ao serviço executado. Não cobre danos por queda, água ou manuseio inadequado. Apresentar nota fiscal para acionamento.',
      'CONCLUIDO',
      (now() - interval '6 days')::date,
      (now() - interval '4 days')::date,
      (now() - interval '6 days' - interval '1 hours')
    )
) AS wo(
  order_number, customer_name, customer_phone, customer_document,
  customer_email, customer_address, customer_rg,
  equipment_model, equipment_imei, defect_notes,
  items_json, subtotal, discount_type, discount_value, total_amount,
  warranty_terms, status, order_date, delivery_date, created_at
)
ON CONFLICT DO NOTHING;