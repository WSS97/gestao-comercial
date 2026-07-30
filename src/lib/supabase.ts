import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthorizedDevice = {
  id: string;
  device_name: string;
  access_code: string;
  is_active: boolean;
  created_at: string;
  company_cnpj?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_address?: string | null;
  company_logo_url?: string | null;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  device_id?: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  device_id: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  additional_amount?: number | null;
  total_amount: number;
  payment_method: string;
  notes: string | null;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO';

export type WorkOrderItem = {
  name: string;
  qty: number;
  unit_price: number;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  subtotal: number;
};

export type WorkOrder = {
  id: string;
  device_id: string | null;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_document: string | null;
  customer_address?: string | null;
  customer_email?: string | null;
  customer_rg?: string | null;
  equipment_model: string | null;
  equipment_imei: string | null;
  defect_notes: string | null;
  items_json: WorkOrderItem[];
  subtotal: number;
  discount_type: string;
  discount_value: number;
  total_amount: number;
  warranty_terms: string | null;
  status: string;
  order_date?: string | null;
  delivery_date?: string | null;
  created_at: string;
};
