import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AdminPaymentFilter = {
  status?: string | null;
  paymentStatus?: string | null;
  search?: string | null;
};

export type FetchUnifiedOptions = {
  statusFilter?: string;
  paymentStatus?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type UnifiedRequest = {
  id: string;
  request_id: string;
  source: "analysis" | "payment_only";
  customer_name: string | null;
  customer_email: string | null;
  vehicle_plate: string | null;

  status: string;
  fine_count: number | null;
  prescribed_count: number | null;
  total_amount_utm: number | null;
  utm_value_clp: number | null;
  raw_analysis_json: unknown;
  internal_notes: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  pdf_url: string | null;

  payment_status: string;
  purchase_status: string;
  payment_amount: number | null;
  payment_paid_at: string | null;
  payment_id: string | null;
  preference_id: string | null;
  payment_customer_email: string | null;
  payment_mock: boolean;
  payment_sandbox: boolean;
  payment_updated_at: string | null;
  payment_local_record: boolean;
  payment_supabase_record: boolean;
  local_only: boolean;

  is_mock: boolean;
  is_sandbox: boolean;
  has_supabase_payment: boolean;

  created_at: string;
  updated_at: string | null;

  payment: {
    requestId: string;
    externalReference: string | null;
    status: string;
    rawStatus: string | null;
    statusDetail: string | null;
    amount: number | null;
    paidAt: string | null;
    paymentId: string | null;
    preferenceId: string | null;
    customerEmail: string | null;
    customerName: string | null;
    plate: string | null;
    product: string | null;
    mock: boolean;
    sandbox: boolean;
    checkoutUrl: string | null;
    updatedAt: string | null;
    createdAt: string | null;
    events: unknown[];
  } | null;
};

export type AdminMetrics = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  completed: number;
  failed: number;
  paid: number;
  paymentApproved: number;
  paymentPending: number;
  paymentRejected: number;
  paidAmount: number;
  withAnalysis: number;
  localPaymentRecords: number;
  localOnlyPayments: number;
  supabasePaymentRecords: number;
  mockPayments: number;
  sandboxPayments: number;
};

type AnalysisRow = Record<string, any>;
type PaymentRow = Record<string, any>;

function text(value: unknown, fallback = ""): string {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }

  return null;
}

function firstDate(...values: unknown[]): string {
  return (
    firstString(...values) ||
    new Date(0).toISOString()
  );
}

function normalizeSearch(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function getRequestId(row: any): string {
  return text(row?.request_id || row?.requestId || row?.external_reference || row?.id);
}

export function normalizeAdminPaymentStatus(status: unknown): string {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved" || value === "paid" || value === "completed") {
    return "approved";
  }

  if (
    value === "created" ||
    value === "pending" ||
    value === "in_process" ||
    value === "processing" ||
    value === "authorized" ||
    value === "unknown" ||
    value === "mock" ||
    !value
  ) {
    return "pending";
  }

  if (
    value === "rejected" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "failed" ||
    value === "refunded" ||
    value === "charged_back"
  ) {
    return "rejected";
  }

  return value;
}

export function getPurchaseStatus(paymentStatus: string): string {
  if (paymentStatus === "approved") return "paid";
  if (paymentStatus === "rejected") return "rejected";
  return "pending";
}

function statusFromPayment(payment: PaymentRow | null | undefined, analysis?: AnalysisRow | null): string {
  const paymentStatus = firstString(payment?.status, payment?.payment_status);
  const analysisPaymentStatus = firstString(analysis?.payment_status);

  if (paymentStatus) return normalizeAdminPaymentStatus(paymentStatus);
  if (analysisPaymentStatus) return normalizeAdminPaymentStatus(analysisPaymentStatus);

  return "pending";
}

function requestStatusFromPaymentStatus(paymentStatus: string, analysisStatus?: unknown): string {
  const original = text(analysisStatus);

  if (original) return original;
  if (paymentStatus === "approved") return "completed";
  if (paymentStatus === "rejected") return "failed";

  return "processing";
}

function paymentRequestId(payment: PaymentRow): string {
  return text(
    payment.request_id ||
      payment.external_reference ||
      payment.requestId ||
      payment.id
  );
}

function paymentCustomerEmail(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;

  return firstString(
    payment.customer_email,
    payment.payer_email,
    payment.payment_customer_email,
    payment.email
  );
}

function paymentCustomerName(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;

  return firstString(
    payment.customer_name,
    payment.payer_name,
    payment.name
  );
}

function paymentPlate(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;

  return firstString(
    payment.vehicle_plate,
    payment.plate,
    payment.patente
  );
}

function paymentMock(payment: PaymentRow | null | undefined): boolean {
  if (!payment) return false;
  return bool(payment.mock ?? payment.is_mock ?? payment.payment_mock);
}

function paymentSandbox(payment: PaymentRow | null | undefined): boolean {
  if (!payment) return false;
  return bool(payment.sandbox ?? payment.is_sandbox ?? payment.payment_sandbox);
}

function paymentPreferenceId(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.preference_id, payment.preferenceId);
}

function paymentPaymentId(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.payment_id, payment.paymentId);
}

function paymentPaidAt(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.paid_at, payment.payment_paid_at, payment.paidAt);
}

function paymentUpdatedAt(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.updated_at, payment.updatedAt, payment.created_at, payment.createdAt);
}

function paymentCreatedAt(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.created_at, payment.createdAt, payment.updated_at, payment.updatedAt);
}

function paymentAmount(payment: PaymentRow | null | undefined, analysis?: AnalysisRow | null): number | null {
  return (
    numberOrNull(payment?.amount) ??
    numberOrNull(payment?.payment_amount) ??
    numberOrNull(analysis?.payment_amount)
  );
}

function paymentRawStatus(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.raw_status, payment.rawStatus);
}

function paymentStatusDetail(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.status_detail, payment.statusDetail);
}

function paymentExternalReference(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.external_reference, payment.request_id, payment.requestId);
}

function paymentProduct(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.product);
}

function paymentCheckoutUrl(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null;
  return firstString(payment.checkout_url, payment.checkoutUrl);
}

function paymentEvents(payment: PaymentRow | null | undefined): unknown[] {
  if (!payment) return [];

  if (Array.isArray(payment.events)) return payment.events;

  return [];
}

function isPaymentNewer(a: PaymentRow, b: PaymentRow): boolean {
  return firstDate(a.updated_at, a.created_at) > firstDate(b.updated_at, b.created_at);
}

function buildPaymentMap(payments: PaymentRow[]): Map<string, PaymentRow> {
  const map = new Map<string, PaymentRow>();

  for (const payment of payments) {
    const requestId = paymentRequestId(payment);
    if (!requestId) continue;

    const existing = map.get(requestId);

    if (!existing || isPaymentNewer(payment, existing)) {
      map.set(requestId, payment);
    }
  }

  return map;
}

function toUnifiedAnalysisRow(analysis: AnalysisRow, payment: PaymentRow | null): UnifiedRequest {
  const requestId = getRequestId(analysis);
  const paymentStatus = statusFromPayment(payment, analysis);
  const amount = paymentAmount(payment, analysis);
  const paidAt = paymentPaidAt(payment) || firstString(analysis.payment_paid_at, analysis.paid_at);
  const customerEmail =
    firstString(analysis.customer_email, paymentCustomerEmail(payment)) || null;
  const customerName =
    firstString(analysis.customer_name, paymentCustomerName(payment)) || null;
  const plate =
    firstString(analysis.vehicle_plate, paymentPlate(payment)) || null;
  const createdAt = firstString(analysis.created_at, paymentCreatedAt(payment)) || new Date().toISOString();
  const updatedAt = firstString(analysis.updated_at, paymentUpdatedAt(payment), createdAt);

  return {
    id: text(analysis.id, requestId),
    request_id: requestId,
    source: "analysis",
    customer_name: customerName,
    customer_email: customerEmail,
    vehicle_plate: plate,

    status: requestStatusFromPaymentStatus(paymentStatus, analysis.status),
    fine_count: numberOrNull(analysis.fine_count),
    prescribed_count: numberOrNull(analysis.prescribed_count),
    total_amount_utm: numberOrNull(analysis.total_amount_utm),
    utm_value_clp: numberOrNull(analysis.utm_value_clp),
    raw_analysis_json: analysis.raw_analysis_json ?? null,
    internal_notes: analysis.internal_notes ?? null,
    pdf_path: analysis.pdf_path ?? null,
    pdf_filename: analysis.pdf_filename ?? null,
    pdf_url: analysis.pdf_url ?? null,

    payment_status: paymentStatus,
    purchase_status: getPurchaseStatus(paymentStatus),
    payment_amount: amount,
    payment_paid_at: paidAt || null,
    payment_id: paymentPaymentId(payment),
    preference_id: paymentPreferenceId(payment),
    payment_customer_email: paymentCustomerEmail(payment) || customerEmail,
    payment_mock: paymentMock(payment),
    payment_sandbox: paymentSandbox(payment),
    payment_updated_at: paymentUpdatedAt(payment),
    payment_local_record: false,
    payment_supabase_record: Boolean(payment),
    local_only: false,

    is_mock: paymentMock(payment),
    is_sandbox: paymentSandbox(payment),
    has_supabase_payment: Boolean(payment),

    created_at: createdAt,
    updated_at: updatedAt || null,

    payment: payment
      ? {
          requestId,
          externalReference: paymentExternalReference(payment),
          status: firstString(payment.status, payment.payment_status) || "unknown",
          rawStatus: paymentRawStatus(payment),
          statusDetail: paymentStatusDetail(payment),
          amount,
          paidAt: paidAt || null,
          paymentId: paymentPaymentId(payment),
          preferenceId: paymentPreferenceId(payment),
          customerEmail: paymentCustomerEmail(payment) || customerEmail,
          customerName: paymentCustomerName(payment) || customerName,
          plate: paymentPlate(payment) || plate,
          product: paymentProduct(payment),
          mock: paymentMock(payment),
          sandbox: paymentSandbox(payment),
          checkoutUrl: paymentCheckoutUrl(payment),
          updatedAt: paymentUpdatedAt(payment),
          createdAt: paymentCreatedAt(payment),
          events: paymentEvents(payment),
        }
      : null,
  };
}

function toUnifiedPaymentOnlyRow(payment: PaymentRow): UnifiedRequest {
  const requestId = paymentRequestId(payment);
  const paymentStatus = statusFromPayment(payment, null);
  const amount = paymentAmount(payment, null);
  const customerEmail = paymentCustomerEmail(payment);
  const customerName = paymentCustomerName(payment);
  const plate = paymentPlate(payment);
  const createdAt = paymentCreatedAt(payment) || new Date().toISOString();
  const updatedAt = paymentUpdatedAt(payment) || createdAt;
  const paidAt = paymentPaidAt(payment);

  return {
    id: requestId,
    request_id: requestId,
    source: "payment_only",
    customer_name: customerName || "Cliente",
    customer_email: customerEmail,
    vehicle_plate: plate,

    status: requestStatusFromPaymentStatus(paymentStatus),
    fine_count: null,
    prescribed_count: null,
    total_amount_utm: null,
    utm_value_clp: null,
    raw_analysis_json: null,
    internal_notes: null,
    pdf_path: null,
    pdf_filename: null,
    pdf_url: null,

    payment_status: paymentStatus,
    purchase_status: getPurchaseStatus(paymentStatus),
    payment_amount: amount,
    payment_paid_at: paidAt,
    payment_id: paymentPaymentId(payment),
    preference_id: paymentPreferenceId(payment),
    payment_customer_email: customerEmail,
    payment_mock: paymentMock(payment),
    payment_sandbox: paymentSandbox(payment),
    payment_updated_at: updatedAt,
    payment_local_record: false,
    payment_supabase_record: true,
    local_only: false,

    is_mock: paymentMock(payment),
    is_sandbox: paymentSandbox(payment),
    has_supabase_payment: true,

    created_at: createdAt,
    updated_at: updatedAt,

    payment: {
      requestId,
      externalReference: paymentExternalReference(payment),
      status: firstString(payment.status, payment.payment_status) || "unknown",
      rawStatus: paymentRawStatus(payment),
      statusDetail: paymentStatusDetail(payment),
      amount,
      paidAt,
      paymentId: paymentPaymentId(payment),
      preferenceId: paymentPreferenceId(payment),
      customerEmail,
      customerName,
      plate,
      product: paymentProduct(payment),
      mock: paymentMock(payment),
      sandbox: paymentSandbox(payment),
      checkoutUrl: paymentCheckoutUrl(payment),
      updatedAt,
      createdAt,
      events: paymentEvents(payment),
    },
  };
}

function matchesSearch(row: UnifiedRequest, search?: string | null): boolean {
  const needle = normalizeSearch(search);

  if (!needle) return true;

  const haystack = [
    row.request_id,
    row.customer_name,
    row.customer_email,
    row.vehicle_plate,
    row.preference_id,
    row.payment_id,
    row.payment_customer_email,
  ]
    .map(normalizeSearch)
    .join(" ");

  return haystack.includes(needle);
}

function matchesPaymentFilter(row: UnifiedRequest, status?: string | null): boolean {
  if (!status || status === "all") return true;

  const normalized = normalizeAdminPaymentStatus(status);

  if (normalized === "pending") {
    return row.payment_status === "pending";
  }

  if (normalized === "approved") {
    return row.payment_status === "approved";
  }

  if (normalized === "rejected") {
    return row.payment_status === "rejected";
  }

  return row.payment_status === normalized;
}

function matchesRequestStatus(row: UnifiedRequest, status?: string | null): boolean {
  if (!status || status === "all") return true;

  const requestStatus = String(row.status || "").trim().toLowerCase();

  if (status === "completed") {
    return requestStatus === "completed" || requestStatus === "approved" || requestStatus === "paid";
  }

  if (status === "processing") {
    return requestStatus === "processing" || requestStatus === "pending";
  }

  if (status === "failed") {
    return requestStatus === "failed" || requestStatus === "rejected";
  }

  return requestStatus === status;
}

function sortRows(rows: UnifiedRequest[]): UnifiedRequest[] {
  return [...rows].sort((a, b) =>
    firstDate(b.payment_updated_at, b.updated_at, b.created_at).localeCompare(
      firstDate(a.payment_updated_at, a.updated_at, a.created_at)
    )
  );
}

async function fetchAnalysisRows(): Promise<AnalysisRow[]> {
  const { data, error } = await supabaseAdmin
    .from("analysis_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.warn("[payment-admin] Error leyendo analysis_requests:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function fetchPaymentRows(): Promise<PaymentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ptm_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.warn("[payment-admin] Error leyendo ptm_payments:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getUnifiedAdminRows(): Promise<UnifiedRequest[]> {
  const [analyses, payments] = await Promise.all([
    fetchAnalysisRows(),
    fetchPaymentRows(),
  ]);

  const paymentMap = buildPaymentMap(payments);
  const analysisIds = new Set<string>();
  const rows: UnifiedRequest[] = [];

  for (const analysis of analyses) {
    const requestId = getRequestId(analysis);
    if (!requestId) continue;

    analysisIds.add(requestId);
    rows.push(toUnifiedAnalysisRow(analysis, paymentMap.get(requestId) || null));
  }

  for (const payment of payments) {
    const requestId = paymentRequestId(payment);
    if (!requestId || analysisIds.has(requestId)) continue;

    rows.push(toUnifiedPaymentOnlyRow(payment));
  }

  return sortRows(rows);
}

export async function fetchUnifiedRequests(options: FetchUnifiedOptions = {}): Promise<{
  data: UnifiedRequest[];
  requests: UnifiedRequest[];
  total: number;
  pages: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.max(1, Math.min(200, Number(options.limit || 20)));
  const paymentStatus = options.paymentStatus || options.statusFilter || "";
  const requestStatus = options.status || "";

  let rows = await getUnifiedAdminRows();

  rows = rows
    .filter((row) => matchesPaymentFilter(row, paymentStatus))
    .filter((row) => matchesRequestStatus(row, requestStatus))
    .filter((row) => matchesSearch(row, options.search));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);

  return {
    data,
    requests: data,
    total,
    pages,
    page,
    limit,
  };
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const rows = await getUnifiedAdminRows();

  const paymentApproved = rows.filter((row) => row.payment_status === "approved").length;
  const paymentPending = rows.filter((row) => row.payment_status === "pending").length;
  const paymentRejected = rows.filter((row) => row.payment_status === "rejected").length;

  const paidRows = rows.filter((row) => row.purchase_status === "paid");

  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === "processing" || row.status === "pending").length,
    approved: rows.filter((row) => row.status === "completed" || row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "failed" || row.status === "rejected").length,
    processing: rows.filter((row) => row.status === "processing" || row.status === "pending").length,
    completed: rows.filter((row) => row.status === "completed" || row.status === "approved").length,
    failed: rows.filter((row) => row.status === "failed" || row.status === "rejected").length,
    paid: paidRows.length,
    paymentApproved,
    paymentPending,
    paymentRejected,
    paidAmount: paidRows.reduce((sum, row) => sum + Number(row.payment_amount || 0), 0),
    withAnalysis: rows.filter((row) => row.source === "analysis").length,
    localPaymentRecords: rows.filter((row) => row.payment_local_record).length,
    localOnlyPayments: rows.filter((row) => row.local_only).length,
    supabasePaymentRecords: rows.filter((row) => row.payment_supabase_record).length,
    mockPayments: rows.filter((row) => row.payment_mock).length,
    sandboxPayments: rows.filter((row) => row.payment_sandbox).length,
  };
}

export async function enrichRequestWithLocalPayment(row: any, explicitRequestId?: string): Promise<UnifiedRequest> {
  const requestId = explicitRequestId || getRequestId(row);
  const rows = await getUnifiedAdminRows();
  const found = rows.find((item) => item.request_id === requestId);

  if (found) return found;

  return toUnifiedAnalysisRow(
    {
      ...row,
      request_id: requestId,
    },
    null
  );
}

export async function getLocalPaymentOnlyRows(
  existingRequestIds: string[],
  filter: AdminPaymentFilter = {}
): Promise<UnifiedRequest[]> {
  const existing = new Set(existingRequestIds.filter(Boolean));
  const rows = await getUnifiedAdminRows();

  return rows
    .filter((row) => row.source === "payment_only")
    .filter((row) => !existing.has(row.request_id))
    .filter((row) => matchesRequestStatus(row, filter.status))
    .filter((row) => matchesPaymentFilter(row, filter.paymentStatus))
    .filter((row) => matchesSearch(row, filter.search));
}

export async function findLocalPaymentAsRequest(requestId: string): Promise<UnifiedRequest | null> {
  const rows = await getUnifiedAdminRows();
  return rows.find((row) => row.request_id === requestId) || null;
}

export async function buildAdminMetrics(_requestRows: any[] = []): Promise<AdminMetrics> {
  return fetchAdminMetrics();
}
