import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AnyRecord = Record<string, any>;

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

function cleanText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeRut(value: unknown): string {
  return cleanText(value).replace(/\s+/g, "").toUpperCase();
}

function isProbablyRut(value: string): boolean {
  return /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9K]$/.test(value);
}

function jsonError(message: string, status = 400, extra: AnyRecord = {}) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function isMissingTableError(error: unknown): boolean {
  const message = cleanText((error as AnyRecord)?.message).toLowerCase();

  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("ptm_client_document_data")
  );
}

function isPaidPayment(row: AnyRecord | null | undefined): boolean {
  if (!row) return false;

  const status = cleanText(
    row.status ??
      row.payment_status ??
      row.raw_status ??
      row.rawStatus ??
      row.purchase_status ??
      row.purchaseStatus
  ).toLowerCase();

  const purchaseStatus = cleanText(
    row.purchase_status ??
      row.purchaseStatus
  ).toLowerCase();

  return (
    status === "approved" ||
    status === "paid" ||
    status === "accredited" ||
    purchaseStatus === "paid" ||
    purchaseStatus === "approved"
  );
}

function getClient() {
  const supabase = getSupabaseAdmin() as AnyRecord;
  return supabase;
}

async function findPaymentRecord(supabase: AnyRecord, requestId: string) {
  const byRequestId = await supabase
    .from("ptm_payments")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();

  if (byRequestId?.data) return byRequestId.data;

  const byExternalReference = await supabase
    .from("ptm_payments")
    .select("*")
    .eq("external_reference", requestId)
    .maybeSingle();

  if (byExternalReference?.data) return byExternalReference.data;

  return null;
}

async function findAnalysisRecord(supabase: AnyRecord, requestId: string) {
  const byRequestId = await supabase
    .from("analysis_requests")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();

  if (byRequestId?.data) return byRequestId.data;

  const byId = await supabase
    .from("analysis_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (byId?.data) return byId.data;

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const safeRequestId = cleanText(requestId);

    if (!safeRequestId) {
      return jsonError("Falta requestId.", 400);
    }

    const supabase = getClient();

    const existing = await supabase
      .from("ptm_client_document_data")
      .select("*")
      .eq("request_id", safeRequestId)
      .maybeSingle();

    if (existing?.error && isMissingTableError(existing.error)) {
      return jsonError("Falta crear la tabla ptm_client_document_data.", 500, {
        needsDatabaseSetup: true,
      });
    }

    if (existing?.error) {
      return jsonError(existing.error.message || "No se pudo leer client-data.", 500);
    }

    return NextResponse.json({
      ok: true,
      requestId: safeRequestId,
      found: Boolean(existing?.data),
      data: existing?.data || null,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error inesperado.", 500);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const safeRequestId = cleanText(requestId);

    if (!safeRequestId) {
      return jsonError("Falta requestId.", 400);
    }

    const body = await request.json().catch(() => ({}));

    const rutSolicitante = normalizeRut(body.rutSolicitante ?? body.rut_solicitante ?? body.rut);
    const profesionOficio = cleanText(body.profesionOficio ?? body.profesion_oficio ?? body.profesion);
    const domicilioSolicitante = cleanText(body.domicilioSolicitante ?? body.domicilio_solicitante ?? body.domicilio);
    const comunaSolicitante = cleanText(body.comunaSolicitante ?? body.comuna_solicitante ?? body.comuna);
    const consentAccepted = Boolean(body.consentAccepted ?? body.consent_accepted);

    const errors: string[] = [];

    if (!rutSolicitante) errors.push("RUT es obligatorio.");
    if (rutSolicitante && !isProbablyRut(rutSolicitante)) errors.push("RUT no tiene formato valido.");
    if (!profesionOficio) errors.push("Profesion u oficio es obligatorio.");
    if (!domicilioSolicitante) errors.push("Domicilio es obligatorio.");
    if (!comunaSolicitante) errors.push("Comuna es obligatoria.");
    if (!consentAccepted) errors.push("Debe aceptar el uso de datos para generar documentos.");

    if (errors.length > 0) {
      return jsonError("Faltan datos para documentos.", 400, { errors });
    }

    const supabase = getClient();

    const payment = await findPaymentRecord(supabase, safeRequestId);
    const analysis = await findAnalysisRecord(supabase, safeRequestId);

    if (!payment && !analysis) {
      return jsonError("No existe solicitud asociada.", 404);
    }

    if (payment && !isPaidPayment(payment)) {
      return jsonError("La solicitud aun no tiene pago aprobado.", 402, {
        paymentStatus: payment.status ?? payment.payment_status ?? null,
        purchaseStatus: payment.purchase_status ?? payment.purchaseStatus ?? null,
      });
    }

    const customerEmail = cleanText(
      payment?.customer_email ??
        payment?.customerEmail ??
        payment?.payer_email ??
        payment?.payerEmail ??
        analysis?.customer_email ??
        analysis?.customerEmail ??
        body.customerEmail ??
        body.email
    );

    const payload = {
      request_id: safeRequestId,
      customer_email: customerEmail || null,
      rut_solicitante: rutSolicitante,
      profesion_oficio: profesionOficio,
      domicilio_solicitante: domicilioSolicitante,
      comuna_solicitante: comunaSolicitante,
      consent_accepted: consentAccepted,
      source: "post_payment_form",
      metadata: {
        userAgent: request.headers.get("user-agent") || null,
        savedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const saved = await supabase
      .from("ptm_client_document_data")
      .upsert(payload, { onConflict: "request_id" })
      .select("*")
      .maybeSingle();

    if (saved?.error && isMissingTableError(saved.error)) {
      return jsonError("Falta crear la tabla ptm_client_document_data.", 500, {
        needsDatabaseSetup: true,
      });
    }

    if (saved?.error) {
      return jsonError(saved.error.message || "No se pudo guardar client-data.", 500);
    }

    return NextResponse.json({
      ok: true,
      requestId: safeRequestId,
      saved: true,
      data: saved?.data || payload,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error inesperado.", 500);
  }
}