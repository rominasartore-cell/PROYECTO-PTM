import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type AnalysisRequest = {
  id: string;
  customer_name: string;
  customer_email: string;
  vehicle_plate: string;
  request_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  fine_count: number;
  prescribed_count: number;
  total_amount_utm: number;
  utm_value_clp: number;
  payment_status: 'pending' | 'approved' | 'failed' | null;
  raw_analysis_json: any;
  internal_notes: string;
  created_at: string;
  updated_at: string;
};

export type AdminNote = {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
};
