import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AnyRecord = Record<string, any>;

export type PaidAccessResult =
  | {
      ok: true;
      requestId: string;
      payment: AnyRecord;
    }
  | {
      ok: false;
      requestId: string;
      status: number;
      code: "MISSING_REQUEST_ID" | "PAYMENT_REQUIRED" | "PAYMENT_LOOKUP_ERROR";
      error: string;
      paymentStatus?: string | null;
      purchaseStatus?: string | null;
    };

function cleanText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function safeRequestId(value: unknown): string {
  return cleanText(value).replace(/[^\w.-]/g, "").slice(0, 180);
}

function getPaymentStatus(row: AnyRecord | null | undefined): string {
  if (!row) return "";

  return cleanText(
    row.status ??
      row.payment_status ??
      row.raw_status ??
      row.rawStatus ??
      row.purchase_status ??
      row.purchaseStatus
  ).toLowerCase();
}

function getPurchaseStatus(row: AnyRecord | null | undefined): string {
  if (!row) return "";

  return cleanText(row.purchase_status ?? row.purchaseStatus).toLowerCase();
}

function getStatusDetail(row: AnyRecord | null | undefined): string {
  if (!row) return "";

  return cleanText(row.status_detail ?? row.statusDetail).toLowerCase();
}

export function isPaidPayment(row: AnyRecord | null | undefined): boolean {
  if (!row) return false;

  const status = getPaymentStatus(row);
  const purchaseStatus = getPurchaseStatus(row);
  const statusDetail = getStatusDetail(row);

  return (
    status === "approved" ||
    status === "paid" ||
    status === "accredited" ||
    purchaseStatus === "paid" ||
    purchaseStatus === "approved" ||
    statusDetail === "accredited"
  );
}

async function findPaymentByField(
  supabase: AnyRecord,
  field: "request_id" | "external_reference",
  requestId: string
): Promise<AnyRecord | null> {
  const result = await supabase
    .from("ptm_payments")
    .select("*")
    .eq(field, requestId)
    .maybeSingle();

  if (result?.error) {
    throw result.error;
  }

  return result?.data || null;
}

export async function findPaymentRecord(requestId: string): Promise<AnyRecord | null> {
  const safeId = safeRequestId(requestId);

  if (!safeId) return null;

  const supabase = getSupabaseAdmin() as AnyRecord;

  const byRequestId = await findPaymentByField(supabase, "request_id", safeId);
  if (byRequestId) return byRequestId;

  const byExternalReference = await findPaymentByField(
    supabase,
    "external_reference",
    safeId
  );

  return byExternalReference;
}

export async function assertPaidAccess(requestId: string): Promise<PaidAccessResult> {
  const safeId = safeRequestId(requestId);

  if (!safeId) {
    return {
      ok: false,
      requestId: "",
      status: 400,
      code: "MISSING_REQUEST_ID",
      error: "Falta requestId.",
    };
  }

  try {
    const payment = await findPaymentRecord(safeId);

    if (!payment) {
      return {
        ok: false,
        requestId: safeId,
        status: 402,
        code: "PAYMENT_REQUIRED",
        error: "Debes desbloquear el resultado para continuar.",
      };
    }

    if (!isPaidPayment(payment)) {
      return {
        ok: false,
        requestId: safeId,
        status: 402,
        code: "PAYMENT_REQUIRED",
        error: "La solicitud aun no tiene pago aprobado.",
        paymentStatus:
          payment.status ??
          payment.payment_status ??
          payment.raw_status ??
          payment.rawStatus ??
          null,
        purchaseStatus:
          payment.purchase_status ?? payment.purchaseStatus ?? null,
      };
    }

    return {
      ok: true,
      requestId: safeId,
      payment,
    };
  } catch (error) {
    return {
      ok: false,
      requestId: safeId,
      status: 500,
      code: "PAYMENT_LOOKUP_ERROR",
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el estado de pago.",
    };
  }
}
