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
};

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
};

export type Sale = {
  id: string;
  device_id: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  total_amount: number;
  payment_method: string;
  notes: string | null;
  status: string;
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
