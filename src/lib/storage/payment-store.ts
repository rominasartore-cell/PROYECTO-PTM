import { promises as fs } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type StoredPaymentStatus =
  | "created"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "unknown";

export type StoredPaymentEvent = {
  at: string;
  type: string;
  payload?: Record<string, unknown>;
};

export type StoredPayment = {
  requestId: string;
  externalReference?: string;
  status: StoredPaymentStatus;
  rawStatus?: string | null;
  statusDetail?: string | null;
  amount: number;
  paidAt?: string | null;
  paymentId?: string | null;
  preferenceId?: string | null;
  customerEmail?: string | null;
  payerEmail?: string | null;
  customerName?: string | null;
  plate?: string | null;
  product?: string | null;
  mock?: boolean;
  sandbox?: boolean;
  checkoutUrl?: string | null;
  urls?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  mercadoPago?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  events: StoredPaymentEvent[];
};

type SavePaymentCreatedInput = {
  requestId: string;
  externalReference?: string;
  status: StoredPaymentStatus;
  amount: number;
  paidAt?: string | null;
  paymentId?: string | null;
  preferenceId?: string | null;
  customerEmail?: string | null;
  payerEmail?: string | null;
  customerName?: string | null;
  plate?: string | null;
  product?: string | null;
  checkoutUrl?: string | null;
  sandbox?: boolean;
  mock?: boolean;
  urls?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  mercadoPago?: Record<string, unknown>;
};

type SavePaymentWebhookUpdateInput = {
  requestId: string;
  externalReference?: string;
  paymentId?: string | null;
  preferenceId?: string | null;
  status: StoredPaymentStatus;
  rawStatus?: string | null;
  statusDetail?: string | null;
  amount?: number;
  payerEmail?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  plate?: string | null;
  product?: string | null;
  sandbox?: boolean;
  mock?: boolean;
  metadata?: Record<string, unknown>;
  mercadoPago?: Record<string, unknown>;
};

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const STORAGE_ROOT = IS_VERCEL
  ? join("/tmp", "ptm-storage")
  : join(process.cwd(), "storage");

const PAYMENTS_INDEX = join(STORAGE_ROOT, "payments-index.json");

function nowIso(): string {
  return new Date().toISOString();
}

function safeRequestId(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]/g, "")
    .slice(0, 180);
}

function paymentFilePath(requestId: string): string {
  return join(STORAGE_ROOT, safeRequestId(requestId), "payment.json");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatus(value: unknown): StoredPaymentStatus {
  const status = String(value || "").trim().toLowerCase();

  if (status === "created") return "created";
  if (status === "approved" || status === "paid" || status === "accredited") {
    return "approved";
  }
  if (
    status === "pending" ||
    status === "in_process" ||
    status === "authorized" ||
    status === "processing"
  ) {
    return "pending";
  }
  if (status === "rejected" || status === "failed") return "rejected";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "charged_back";

  return "unknown";
}

function isApproved(status: StoredPaymentStatus): boolean {
  return status === "approved";
}

function mapSupabasePayment(row: any): StoredPayment | null {
  if (!row?.request_id) return null;

  const status = normalizeStatus(row.status || row.payment_status);
  const createdAt = row.created_at || nowIso();
  const updatedAt = row.updated_at || createdAt;
  const customerEmail = row.customer_email || row.payer_email || null;

  return {
    requestId: row.request_id,
    externalReference: row.external_reference || row.request_id,
    status,
    rawStatus: row.raw_status || null,
    statusDetail: row.status_detail || null,
    amount: Number(row.amount || row.payment_amount || 0),
    paidAt:
      row.paid_at ||
      row.payment_paid_at ||
      (isApproved(status) ? updatedAt : null),
    paymentId: row.payment_id || null,
    preferenceId: row.preference_id || null,
    customerEmail,
    payerEmail: row.payer_email || customerEmail,
    customerName: row.customer_name || null,
    plate: row.vehicle_plate || row.plate || null,
    product: row.product || "informe-completo-prescripcion",
    mock: Boolean(row.mock),
    sandbox: Boolean(row.sandbox),
    checkoutUrl: row.checkout_url || null,
    urls: row.urls || {},
    metadata: row.metadata || {},
    mercadoPago: row.mercado_pago || {},
    createdAt,
    updatedAt,
    events: Array.isArray(row.events) ? row.events : [],
  };
}

function toSupabasePayload(payment: StoredPayment): Record<string, unknown> {
  const email = payment.customerEmail || payment.payerEmail || null;

  return {
    request_id: payment.requestId,
    external_reference: payment.externalReference || payment.requestId,
    status: payment.status,
    raw_status: payment.rawStatus || null,
    status_detail: payment.statusDetail || null,
    amount: Number(payment.amount || 0),
    paid_at:
      payment.paidAt ||
      (payment.status === "approved" ? payment.updatedAt : null),
    payment_id: payment.paymentId || null,
    preference_id: payment.preferenceId || null,
    customer_email: email,
    payer_email: payment.payerEmail || email,
    customer_name: payment.customerName || null,
    vehicle_plate: payment.plate || null,
    product: payment.product || "informe-completo-prescripcion",
    mock: Boolean(payment.mock),
    sandbox: Boolean(payment.sandbox),
    checkout_url: payment.checkoutUrl || null,
    urls: payment.urls || {},
    metadata: payment.metadata || {},
    mercado_pago: payment.mercadoPago || {},
    events: payment.events || [],
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
}

async function savePaymentToSupabase(payment: StoredPayment): Promise<boolean> {
  try {
    const payload = toSupabasePayload(payment);

    const { error } = await supabaseAdmin
      .from("ptm_payments")
      .upsert(payload, { onConflict: "request_id" });

    if (error) {
      console.error("[payment-store] Supabase upsert error:", {
        requestId: payment.requestId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[payment-store] Supabase unavailable:", {
      requestId: payment.requestId,
      error,
    });
    return false;
  }
}

async function requireSupabasePaymentSave(
  payment: StoredPayment,
  action: "created" | "webhook_update"
): Promise<void> {
  const supabaseSaved = await savePaymentToSupabase(payment);

  if (!supabaseSaved) {
    throw new Error(
      `[payment-store] No se pudo guardar el pago en Supabase. action=${action} requestId=${payment.requestId}`
    );
  }
}

async function getPaymentFromSupabase(
  requestId: string
): Promise<StoredPayment | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ptm_payments")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (error) {
      console.error("[payment-store] Supabase read error:", {
        requestId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return null;
    }

    return mapSupabasePayment(data);
  } catch (error) {
    console.error("[payment-store] Supabase read unavailable:", {
      requestId,
      error,
    });
    return null;
  }
}

async function listPaymentsFromSupabase(): Promise<StoredPayment[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ptm_payments")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[payment-store] Supabase list error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    return Array.isArray(data)
      ? (data.map(mapSupabasePayment).filter(Boolean) as StoredPayment[])
      : [];
  } catch (error) {
    console.error("[payment-store] Supabase list unavailable:", error);
    return [];
  }
}

async function savePaymentLocally(payment: StoredPayment): Promise<void> {
  try {
    const requestId = safeRequestId(payment.requestId);
    const dir = join(STORAGE_ROOT, requestId);

    await ensureDir(dir);
    await fs.writeFile(
      paymentFilePath(requestId),
      JSON.stringify(payment, null, 2),
      "utf8"
    );

    const index = await readJsonFile<Record<string, unknown>>(
      PAYMENTS_INDEX,
      {}
    );

    index[requestId] = {
      requestId,
      status: payment.status,
      amount: payment.amount,
      customerEmail: payment.customerEmail || payment.payerEmail || null,
      customerName: payment.customerName,
      plate: payment.plate,
      product: payment.product,
      mock: payment.mock,
      sandbox: payment.sandbox,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    await ensureDir(STORAGE_ROOT);
    await fs.writeFile(PAYMENTS_INDEX, JSON.stringify(index, null, 2), "utf8");
  } catch (error) {
    console.warn("[payment-store] Local backup skipped:", error);
  }
}

async function getPaymentLocally(
  requestId: string
): Promise<StoredPayment | null> {
  try {
    const safeId = safeRequestId(requestId);
    return readJsonFile<StoredPayment | null>(paymentFilePath(safeId), null);
  } catch {
    return null;
  }
}

async function listPaymentsLocally(): Promise<StoredPayment[]> {
  try {
    const index = await readJsonFile<Record<string, any>>(PAYMENTS_INDEX, {});
    const ids = Object.keys(index);

    const payments = await Promise.all(ids.map((id) => getPaymentLocally(id)));

    return payments
      .filter(Boolean)
      .sort((a, b) =>
        String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || ""))
      ) as StoredPayment[];
  } catch {
    return [];
  }
}

function mergePayment(
  base: StoredPayment | null,
  patch: Partial<StoredPayment>
): StoredPayment {
  const timestamp = nowIso();
  const status = normalizeStatus(patch.status || base?.status || "unknown");
  const customerEmail =
    patch.customerEmail ??
    patch.payerEmail ??
    base?.customerEmail ??
    base?.payerEmail ??
    null;

  return {
    requestId: safeRequestId(patch.requestId || base?.requestId || ""),
    externalReference:
      patch.externalReference ||
      base?.externalReference ||
      patch.requestId ||
      base?.requestId ||
      "",
    status,
    rawStatus: patch.rawStatus ?? base?.rawStatus ?? null,
    statusDetail: patch.statusDetail ?? base?.statusDetail ?? null,
    amount: Number(patch.amount ?? base?.amount ?? 0),
    paidAt:
      patch.paidAt ??
      base?.paidAt ??
      (status === "approved" ? timestamp : null),
    paymentId: patch.paymentId ?? base?.paymentId ?? null,
    preferenceId: patch.preferenceId ?? base?.preferenceId ?? null,
    customerEmail,
    payerEmail: patch.payerEmail ?? customerEmail,
    customerName: patch.customerName ?? base?.customerName ?? null,
    plate: patch.plate ?? base?.plate ?? null,
    product: patch.product ?? base?.product ?? "informe-completo-prescripcion",
    mock: patch.mock ?? base?.mock ?? false,
    sandbox: patch.sandbox ?? base?.sandbox ?? false,
    checkoutUrl: patch.checkoutUrl ?? base?.checkoutUrl ?? null,
    urls: patch.urls ?? base?.urls ?? {},
    metadata: patch.metadata ?? base?.metadata ?? {},
    mercadoPago: patch.mercadoPago ?? base?.mercadoPago ?? {},
    createdAt: base?.createdAt || patch.createdAt || timestamp,
    updatedAt: timestamp,
    events: patch.events ?? base?.events ?? [],
  };
}

export async function getStoredPayment(
  requestId: string
): Promise<StoredPayment | null> {
  const safeId = safeRequestId(requestId);
  if (!safeId) return null;

  const fromSupabase = await getPaymentFromSupabase(safeId);
  if (fromSupabase) return fromSupabase;

  return getPaymentLocally(safeId);
}

export async function savePaymentCreated(
  input: SavePaymentCreatedInput
): Promise<StoredPayment> {
  const timestamp = nowIso();
  const requestId = safeRequestId(input.requestId);

  if (!requestId) {
    throw new Error("[payment-store] requestId inválido al crear pago.");
  }

  const status = normalizeStatus(input.status);
  const email = input.customerEmail || input.payerEmail || null;

  const payment: StoredPayment = {
    requestId,
    externalReference: input.externalReference || requestId,
    status,
    rawStatus: null,
    statusDetail: null,
    amount: Number(input.amount || 0),
    paidAt: status === "approved" ? input.paidAt || timestamp : input.paidAt || null,
    paymentId: input.paymentId || null,
    preferenceId: input.preferenceId || null,
    customerEmail: email,
    payerEmail: input.payerEmail || email,
    customerName: input.customerName || null,
    plate: input.plate || null,
    product: input.product || "informe-completo-prescripcion",
    mock: Boolean(input.mock),
    sandbox: Boolean(input.sandbox),
    checkoutUrl: input.checkoutUrl || null,
    urls: input.urls || {},
    metadata: input.metadata || {},
    mercadoPago: input.mercadoPago || {},
    createdAt: timestamp,
    updatedAt: timestamp,
    events: [
      {
        at: timestamp,
        type: "payment_created",
        payload: {
          mock: Boolean(input.mock),
          sandbox: Boolean(input.sandbox),
          status,
          amount: Number(input.amount || 0),
          preferenceId: input.preferenceId || "",
        },
      },
    ],
  };

  await requireSupabasePaymentSave(payment, "created");
  await savePaymentLocally(payment);

  return payment;
}

export async function savePaymentWebhookUpdate(
  input: SavePaymentWebhookUpdateInput
): Promise<StoredPayment> {
  const existing = await getStoredPayment(input.requestId);
  const timestamp = nowIso();
  const requestId = safeRequestId(input.requestId);

  if (!requestId) {
    throw new Error("[payment-store] requestId inválido al actualizar pago.");
  }

  const status = normalizeStatus(input.status);
  const email =
    input.customerEmail ||
    input.payerEmail ||
    existing?.customerEmail ||
    existing?.payerEmail ||
    null;

  const updated = mergePayment(existing, {
    requestId,
    externalReference: input.externalReference || existing?.externalReference || requestId,
    status,
    rawStatus: input.rawStatus || null,
    statusDetail: input.statusDetail || null,
    amount: Number(input.amount ?? existing?.amount ?? 0),
    paidAt: status === "approved" ? existing?.paidAt || timestamp : existing?.paidAt || null,
    paymentId: input.paymentId || existing?.paymentId || null,
    preferenceId: input.preferenceId || existing?.preferenceId || null,
    customerEmail: email,
    payerEmail: input.payerEmail || email,
    customerName: input.customerName || existing?.customerName || null,
    plate: input.plate || existing?.plate || null,
    product: input.product || existing?.product || "informe-completo-prescripcion",
    mock: input.mock ?? existing?.mock ?? false,
    sandbox: input.sandbox ?? existing?.sandbox ?? false,
    metadata: {
      ...(existing?.metadata || {}),
      ...(input.metadata || {}),
    },
    mercadoPago: {
      ...(existing?.mercadoPago || {}),
      ...(input.mercadoPago || {}),
    },
    events: [
      ...(existing?.events || []),
      {
        at: timestamp,
        type: "payment_webhook_update",
        payload: {
          status,
          rawStatus: input.rawStatus || "",
          statusDetail: input.statusDetail || "",
          paymentId: input.paymentId || "",
          amount: Number(input.amount ?? existing?.amount ?? 0),
        },
      },
    ],
  });

  await requireSupabasePaymentSave(updated, "webhook_update");
  await savePaymentLocally(updated);

  return updated;
}

export async function listStoredPayments(): Promise<StoredPayment[]> {
  const supabasePayments = await listPaymentsFromSupabase();
  const localPayments = await listPaymentsLocally();

  const byId = new Map<string, StoredPayment>();

  for (const payment of localPayments) {
    byId.set(payment.requestId, payment);
  }

  for (const payment of supabasePayments) {
    byId.set(payment.requestId, payment);
  }

  return Array.from(byId.values()).sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

export async function getAllStoredPayments(): Promise<StoredPayment[]> {
  return listStoredPayments();
}