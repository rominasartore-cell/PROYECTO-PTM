import { promises as fs } from "fs";
import { join } from "path";
import { getStoredPayment } from "@/lib/storage/payment-store";

const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";

export type AdminPaymentFilter = {
  status?: string | null;
  paymentStatus?: string | null;
  search?: string | null;
};

type PaymentIndexRow = {
  requestId?: string;
  preferenceId?: string;
  paymentId?: string;
  status?: string;
  rawStatus?: string;
  statusDetail?: string;
  amount?: number;
  customerEmail?: string;
  customerName?: string;
  payerEmail?: string;
  plate?: string;
  product?: string;
  paidAt?: string;
  updatedAt?: string;
  createdAt?: string;
  mock?: boolean;
  sandbox?: boolean;
  source?: "local" | "supabase";
};

function normalizeSearch(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function getRequestId(row: any): string {
  return String(row?.request_id || row?.requestId || row?.id || "").trim();
}

export function normalizeAdminPaymentStatus(status: unknown): string {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved" || value === "paid") return "approved";

  if (
    value === "created" ||
    value === "pending" ||
    value === "in_process" ||
    value === "authorized" ||
    value === "unknown" ||
    value === "mock"
  ) {
    return "pending";
  }

  if (
    value === "rejected" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "refunded" ||
    value === "charged_back"
  ) {
    return "rejected";
  }

  return value || "pending";
}

export function getPurchaseStatus(paymentStatus: string): string {
  if (paymentStatus === "approved") return "paid";
  if (paymentStatus === "rejected") return "rejected";
  return "pending";
}

async function getSupabaseAdminSafe(): Promise<any | null> {
  try {
    const module = await import("@/lib/supabase-admin");
    return module.supabaseAdmin || module.getSupabaseAdmin?.() || null;
  } catch (error) {
    console.warn("[PTM admin payment] Supabase no disponible para admin payments.", error);
    return null;
  }
}

async function readLocalPaymentsIndex(): Promise<PaymentIndexRow[]> {
  try {
    const path = join(STORAGE_PATH, "payments-index.json");
    const content = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object") return [];

    return (Object.values(parsed) as PaymentIndexRow[]).map((payment) => ({
      ...payment,
      source: "local",
    }));
  } catch {
    return [];
  }
}

async function readSupabasePayments(): Promise<PaymentIndexRow[]> {
  const supabase = await getSupabaseAdminSafe();

  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("ptm_payments")
      .select(
        "request_id,preference_id,payment_id,status,raw_status,status_detail,amount,customer_email,customer_name,payer_email,plate,product,paid_at,created_at,updated_at,mock,sandbox"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.warn("[PTM admin payment] No se pudo leer ptm_payments.", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      requestId: row.request_id,
      preferenceId: row.preference_id || "",
      paymentId: row.payment_id || "",
      status: row.status || "unknown",
      rawStatus: row.raw_status || "",
      statusDetail: row.status_detail || "",
      amount: Number(row.amount || 0),
      customerEmail: row.customer_email || row.payer_email || "",
      customerName: row.customer_name || "",
      payerEmail: row.payer_email || "",
      plate: row.plate || "",
      product: row.product || "",
      paidAt: row.paid_at || "",
      updatedAt: row.updated_at || "",
      createdAt: row.created_at || "",
      mock: Boolean(row.mock),
      sandbox: Boolean(row.sandbox),
      source: "supabase",
    }));
  } catch (error) {
    console.warn("[PTM admin payment] Error leyendo ptm_payments.", error);
    return [];
  }
}

async function readAllPaymentRows(): Promise<PaymentIndexRow[]> {
  const [localRows, supabaseRows] = await Promise.all([
    readLocalPaymentsIndex(),
    readSupabasePayments(),
  ]);

  const byRequestId = new Map<string, PaymentIndexRow>();

  for (const payment of localRows) {
    const requestId = String(payment.requestId || "").trim();
    if (requestId) byRequestId.set(requestId, payment);
  }

  // Supabase manda sobre local en produccion.
  for (const payment of supabaseRows) {
    const requestId = String(payment.requestId || "").trim();
    if (requestId) byRequestId.set(requestId, payment);
  }

  return Array.from(byRequestId.values()).sort((a, b) => {
    return String(b.createdAt || b.updatedAt || "").localeCompare(
      String(a.createdAt || a.updatedAt || "")
    );
  });
}

function matchesSearch(row: any, search?: string | null): boolean {
  const needle = normalizeSearch(search);

  if (!needle) return true;

  const haystack = [
    row?.request_id,
    row?.requestId,
    row?.customer_name,
    row?.customerName,
    row?.customer_email,
    row?.customerEmail,
    row?.vehicle_plate,
    row?.plate,
    row?.payment_customer_email,
  ]
    .map(normalizeSearch)
    .join(" ");

  return haystack.includes(needle);
}

function matchesRequestStatus(row: any, status?: string | null): boolean {
  if (!status || status === "all") return true;

  const requestStatus = String(row?.status || "").trim().toLowerCase();

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

function matchesPaymentStatus(row: any, paymentStatus?: string | null): boolean {
  if (!paymentStatus || paymentStatus === "all") return true;

  return normalizeAdminPaymentStatus(row?.payment_status || row?.paymentStatus) === paymentStatus;
}

export async function enrichRequestWithLocalPayment(row: any, explicitRequestId?: string) {
  const requestId = explicitRequestId || getRequestId(row);
  const payment = requestId ? await getStoredPayment(requestId) : null;

  if (!payment) {
    const paymentStatus = normalizeAdminPaymentStatus(row?.payment_status);

    return {
      ...row,
      payment_status: paymentStatus,
      purchase_status: getPurchaseStatus(paymentStatus),
      payment_amount: row?.payment_amount ?? null,
      payment_paid_at: row?.paid_at ?? null,
      payment_local_record: false,
      payment_supabase_record: false,
      payment: null,
    };
  }

  const paymentStatus = normalizeAdminPaymentStatus(payment.status);

  return {
    ...row,
    request_id: row?.request_id || payment.requestId,
    customer_name: row?.customer_name || payment.customerName || "Cliente",
    customer_email: row?.customer_email || payment.customerEmail || payment.payerEmail || null,
    vehicle_plate: row?.vehicle_plate || payment.plate || null,
    status: row?.status || (paymentStatus === "approved" ? "completed" : "processing"),
    payment_status: paymentStatus,
    purchase_status: getPurchaseStatus(paymentStatus),
    payment_amount: payment.amount ?? row?.payment_amount ?? null,
    payment_paid_at: payment.paidAt || row?.paid_at || null,
    payment_id: payment.paymentId || row?.payment_id || null,
    preference_id: payment.preferenceId || row?.preference_id || null,
    payment_customer_email:
      payment.customerEmail || payment.payerEmail || row?.customer_email || null,
    payment_mock: Boolean(payment.mock),
    payment_sandbox: Boolean(payment.sandbox),
    payment_updated_at: payment.updatedAt || null,
    payment_local_record: true,
    payment_supabase_record: !row?.local_only,
    payment: {
      requestId: payment.requestId,
      externalReference: payment.externalReference || null,
      status: payment.status,
      rawStatus: payment.rawStatus || null,
      statusDetail: payment.statusDetail || null,
      amount: payment.amount ?? null,
      paidAt: payment.paidAt || null,
      paymentId: payment.paymentId || null,
      preferenceId: payment.preferenceId || null,
      customerEmail: payment.customerEmail || payment.payerEmail || null,
      customerName: payment.customerName || null,
      plate: payment.plate || null,
      product: payment.product || null,
      mock: Boolean(payment.mock),
      sandbox: Boolean(payment.sandbox),
      checkoutUrl: payment.checkoutUrl || null,
      updatedAt: payment.updatedAt,
      createdAt: payment.createdAt,
      events: payment.events || [],
    },
  };
}

export async function getLocalPaymentOnlyRows(
  existingRequestIds: string[],
  filter: AdminPaymentFilter = {}
) {
  const existing = new Set(existingRequestIds.filter(Boolean));
  const paymentRows = await readAllPaymentRows();

  const syntheticRows = paymentRows
    .filter((payment) => {
      const requestId = String(payment.requestId || "").trim();
      return requestId && !existing.has(requestId);
    })
    .map((payment) => {
      const paymentStatus = normalizeAdminPaymentStatus(payment.status);
      const isLocal = payment.source !== "supabase";

      return {
        id: payment.requestId,
        request_id: payment.requestId,
        customer_name: payment.customerName || "Cliente",
        customer_email: payment.customerEmail || payment.payerEmail || "",
        vehicle_plate: payment.plate || "",
        status: paymentStatus === "approved" ? "completed" : "processing",
        payment_status: paymentStatus,
        purchase_status: getPurchaseStatus(paymentStatus),
        payment_amount: Number(payment.amount || 0),
        payment_paid_at: payment.paidAt || null,
        payment_id: payment.paymentId || null,
        preference_id: payment.preferenceId || null,
        created_at: payment.createdAt || payment.updatedAt || new Date().toISOString(),
        updated_at: payment.updatedAt || payment.createdAt || new Date().toISOString(),
        local_only: isLocal,
        payment_local_record: isLocal,
        payment_supabase_record: !isLocal,
        payment_mock: Boolean(payment.mock),
        payment_sandbox: Boolean(payment.sandbox),
        payment: {
          requestId: payment.requestId,
          status: payment.status,
          rawStatus: payment.rawStatus || null,
          statusDetail: payment.statusDetail || null,
          amount: Number(payment.amount || 0),
          paidAt: payment.paidAt || null,
          paymentId: payment.paymentId || null,
          preferenceId: payment.preferenceId || null,
          customerEmail: payment.customerEmail || payment.payerEmail || null,
          customerName: payment.customerName || null,
          plate: payment.plate || null,
          product: payment.product || null,
          mock: Boolean(payment.mock),
          sandbox: Boolean(payment.sandbox),
          updatedAt: payment.updatedAt || null,
          createdAt: payment.createdAt || null,
        },
      };
    })
    .filter((row) => matchesRequestStatus(row, filter.status))
    .filter((row) => matchesPaymentStatus(row, filter.paymentStatus))
    .filter((row) => matchesSearch(row, filter.search))
    .sort((a, b) => {
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });

  return syntheticRows;
}

export async function findLocalPaymentAsRequest(requestId: string) {
  const payment = await getStoredPayment(requestId);

  if (!payment) return null;

  return enrichRequestWithLocalPayment(
    {
      id: payment.requestId,
      request_id: payment.requestId,
      customer_name: payment.customerName || "Cliente",
      customer_email: payment.customerEmail || payment.payerEmail || "",
      vehicle_plate: payment.plate || "",
      status: payment.status === "approved" ? "completed" : "processing",
      payment_status: normalizeAdminPaymentStatus(payment.status),
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
      local_only: false,
    },
    payment.requestId
  );
}

export async function buildAdminMetrics(requestRows: any[]) {
  const requestIds = requestRows.map(getRequestId).filter(Boolean);
  const enriched = await Promise.all(requestRows.map((row) => enrichRequestWithLocalPayment(row)));
  const paymentOnlyRows = await getLocalPaymentOnlyRows(requestIds);

  const allRows = [...enriched, ...paymentOnlyRows];

  const total = allRows.length;

  const processing = allRows.filter((r) => r.status === "processing" || r.status === "pending").length;
  const completed = allRows.filter((r) => r.status === "completed" || r.status === "approved").length;
  const failed = allRows.filter((r) => r.status === "failed" || r.status === "rejected").length;

  const paymentApproved = allRows.filter((r) => r.payment_status === "approved").length;
  const paymentPending = allRows.filter((r) => r.payment_status === "pending").length;
  const paymentRejected = allRows.filter((r) => r.payment_status === "rejected").length;
  const paid = allRows.filter((r) => r.purchase_status === "paid").length;

  const paidAmount = allRows
    .filter((r) => r.purchase_status === "paid")
    .reduce((sum, r) => sum + Number(r.payment_amount || 0), 0);

  const localPaymentRecords = allRows.filter((r) => r.payment_local_record).length;
  const localOnlyPayments = allRows.filter((r) => r.local_only).length;
  const supabasePaymentRecords = allRows.filter((r) => r.payment_supabase_record).length;
  const mockPayments = allRows.filter((r) => r.payment_mock).length;
  const sandboxPayments = allRows.filter((r) => r.payment_sandbox).length;

  return {
    total,
    pending: processing,
    approved: completed,
    rejected: failed,
    processing,
    completed,
    failed,
    paid,
    paymentApproved,
    paymentPending,
    paymentRejected,
    paidAmount,
    localPaymentRecords,
    localOnlyPayments,
    supabasePaymentRecords,
    mockPayments,
    sandboxPayments,
  };
}
