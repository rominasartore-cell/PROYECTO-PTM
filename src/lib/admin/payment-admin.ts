import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalysisRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  vehicle_plate: string | null;
  request_id: string;
  status: string | null;
  fine_count: number | null;
  prescribed_count: number | null;
  total_amount_utm: number | null;
  utm_value_clp: number | null;
  payment_status: string | null;
  raw_analysis_json: unknown;
  internal_notes: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string | null;
};

type PaymentRow = {
  id: string;
  preference_id: string | null;
  payment_id: string | null;
  external_reference: string | null;
  status: string;
  amount: number | null;
  payer_name: string | null;
  payer_email: string | null;
  plate: string | null;
  is_mock: boolean;
  is_sandbox: boolean;
  metadata: unknown;
  created_at: string;
  updated_at: string | null;
};

export type UnifiedRequest = {
  request_id: string;
  source: 'analysis' | 'payment_only';
  customer_name: string | null;
  customer_email: string | null;
  vehicle_plate: string | null;
  // Analysis fields
  status: string | null;
  fine_count: number | null;
  prescribed_count: number | null;
  total_amount_utm: number | null;
  utm_value_clp: number | null;
  raw_analysis_json: unknown;
  internal_notes: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  pdf_url: string | null;
  // Payment fields
  payment_status: string | null; // normalized: pending | approved | rejected | null
  preference_id: string | null;
  payment_id: string | null;
  payment_amount: number | null;
  is_mock: boolean;
  is_sandbox: boolean;
  has_supabase_payment: boolean;
  created_at: string;
  updated_at: string | null;
};

export type AdminMetrics = {
  total: number;
  paid: number;
  paymentPending: number;
  rejected: number;
  withAnalysis: number;
  supabasePaymentRecords: number;
  mockPayments: number;
  sandboxPayments: number;
  localOnlyPayments: number;
};

export type FetchUnifiedOptions = {
  statusFilter?: string;
  search?: string;
  page?: number;
  limit?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePaymentStatus(
  analysisStatus: string | null,
  ptmStatus: string | null,
  hasPtmPayment: boolean
): string | null {
  if (hasPtmPayment && ptmStatus) {
    if (ptmStatus === 'approved') return 'approved';
    if (['rejected', 'cancelled', 'failed'].includes(ptmStatus)) return 'rejected';
    if (['created', 'pending', 'processing'].includes(ptmStatus)) return 'pending';
  }
  if (analysisStatus) {
    if (analysisStatus === 'approved') return 'approved';
    if (['failed', 'rejected'].includes(analysisStatus)) return 'rejected';
    if (analysisStatus === 'pending') return 'pending';
  }
  return null;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

export async function fetchUnifiedRequests(opts: FetchUnifiedOptions = {}): Promise<{
  data: UnifiedRequest[];
  total: number;
  pages: number;
}> {
  const { statusFilter = 'all', search = '', page = 1, limit = 10 } = opts;

  const [analysisRes, paymentsRes] = await Promise.all([
    supabaseAdmin.from('analysis_requests').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('ptm_payments').select('*').order('created_at', { ascending: false }),
  ]);

  const analyses = ((analysisRes.data as AnalysisRow[]) || []);
  const payments = ((paymentsRes.data as PaymentRow[]) || []);

  // Index payments by external_reference for O(1) lookup.
  // Query is ordered DESC so the first entry per key is the most recent payment.
  const paymentMap = new Map<string, PaymentRow>();
  for (const p of payments) {
    if (p.external_reference && !paymentMap.has(p.external_reference)) {
      paymentMap.set(p.external_reference, p);
    }
  }

  const analysisIds = new Set(analyses.map(a => a.request_id));

  // Merge analysis rows with matching payment info
  const unified: UnifiedRequest[] = analyses.map(a => {
    const payment = paymentMap.get(a.request_id) ?? null;
    return {
      request_id: a.request_id,
      source: 'analysis',
      customer_name: a.customer_name ?? null,
      customer_email: a.customer_email ?? null,
      vehicle_plate: a.vehicle_plate ?? null,
      status: a.status ?? null,
      fine_count: a.fine_count ?? null,
      prescribed_count: a.prescribed_count ?? null,
      total_amount_utm: a.total_amount_utm ?? null,
      utm_value_clp: a.utm_value_clp ?? null,
      raw_analysis_json: a.raw_analysis_json,
      internal_notes: a.internal_notes ?? null,
      pdf_path: a.pdf_path ?? null,
      pdf_filename: a.pdf_filename ?? null,
      pdf_url: a.pdf_url ?? null,
      payment_status: normalizePaymentStatus(a.payment_status, payment?.status ?? null, !!payment),
      preference_id: payment?.preference_id ?? null,
      payment_id: payment?.payment_id ?? null,
      payment_amount: payment?.amount ?? null,
      is_mock: payment?.is_mock ?? false,
      is_sandbox: payment?.is_sandbox ?? false,
      has_supabase_payment: !!payment,
      created_at: a.created_at,
      updated_at: a.updated_at ?? null,
    };
  });

  // Add orphan payment rows (in ptm_payments but not in analysis_requests)
  for (const p of payments) {
    if (!p.external_reference || analysisIds.has(p.external_reference)) continue;
    unified.push({
      request_id: p.external_reference || p.id,
      source: 'payment_only',
      customer_name: p.payer_name ?? null,
      customer_email: p.payer_email ?? null,
      vehicle_plate: p.plate ?? null,
      status: null,
      fine_count: null,
      prescribed_count: null,
      total_amount_utm: null,
      utm_value_clp: null,
      raw_analysis_json: null,
      internal_notes: null,
      pdf_path: null,
      pdf_filename: null,
      pdf_url: null,
      payment_status: normalizePaymentStatus(null, p.status, true),
      preference_id: p.preference_id ?? null,
      payment_id: p.payment_id ?? null,
      payment_amount: p.amount ?? null,
      is_mock: p.is_mock,
      is_sandbox: p.is_sandbox,
      has_supabase_payment: true,
      created_at: p.created_at,
      updated_at: p.updated_at ?? null,
    });
  }

  // Sort by created_at desc (both tables merged)
  unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply status filter
  let filtered = unified;
  if (statusFilter && statusFilter !== 'all') {
    filtered = unified.filter(r => {
      if (statusFilter === 'pending') return r.payment_status === 'pending' || r.payment_status === null;
      if (statusFilter === 'approved') return r.payment_status === 'approved';
      if (statusFilter === 'rejected') return r.payment_status === 'rejected';
      return true;
    });
  }

  // Apply search (name, email, plate, preference_id, payment_id, request_id)
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.vehicle_plate?.toLowerCase().includes(q) ||
      r.preference_id?.toLowerCase().includes(q) ||
      r.payment_id?.toLowerCase().includes(q) ||
      r.request_id?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  return { data: filtered.slice(offset, offset + limit), total, pages };
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const [analysisRes, paymentsRes] = await Promise.all([
    supabaseAdmin.from('analysis_requests').select('request_id, payment_status'),
    supabaseAdmin.from('ptm_payments').select('external_reference, status, is_mock, is_sandbox'),
  ]);

  const analyses: { request_id: string; payment_status: string | null }[] =
    (analysisRes.data as { request_id: string; payment_status: string | null }[]) || [];
  const payments: { external_reference: string | null; status: string; is_mock: boolean; is_sandbox: boolean }[] =
    (paymentsRes.data as { external_reference: string | null; status: string; is_mock: boolean; is_sandbox: boolean }[]) || [];

  const paymentMap = new Map<string, { status: string; is_mock: boolean; is_sandbox: boolean }>();
  for (const p of payments) {
    if (p.external_reference && !paymentMap.has(p.external_reference)) paymentMap.set(p.external_reference, p);
  }

  const analysisIds = new Set(analyses.map(a => a.request_id));
  const orphanPayments = payments.filter(p => !p.external_reference || !analysisIds.has(p.external_reference));

  // Compute normalized statuses for all unique rows
  const allStatuses: string[] = [];
  for (const a of analyses) {
    const p = paymentMap.get(a.request_id);
    allStatuses.push(normalizePaymentStatus(a.payment_status, p?.status ?? null, !!p) ?? 'none');
  }
  for (const p of orphanPayments) {
    allStatuses.push(normalizePaymentStatus(null, p.status, true) ?? 'none');
  }

  return {
    total: allStatuses.length,
    paid: allStatuses.filter(s => s === 'approved').length,
    paymentPending: allStatuses.filter(s => s === 'pending').length,
    rejected: allStatuses.filter(s => s === 'rejected').length,
    withAnalysis: analyses.length,
    supabasePaymentRecords: payments.length,
    mockPayments: payments.filter(p => p.is_mock).length,
    sandboxPayments: payments.filter(p => p.is_sandbox && !p.is_mock).length,
    localOnlyPayments: analyses.filter(a => !paymentMap.has(a.request_id)).length,
  };
}
