import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendClientDocumentsReady } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

type AnyRecord = Record<string, unknown>;

function jsonResponse(body: AnyRecord, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getString(value: unknown): string {
  return String(value ?? "").trim();
}

function firstString(record: AnyRecord | null | undefined, keys: string[]): string {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function firstNumberOrString(
  record: AnyRecord | null | undefined,
  keys: string[]
): number | string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function isPaidRecord(record: AnyRecord | null | undefined): boolean {
  if (!record) {
    return false;
  }

  const status = firstString(record, [
    "status",
    "payment_status",
    "raw_status",
    "rawStatus",
  ]).toLowerCase();

  const statusDetail = firstString(record, [
    "status_detail",
    "statusDetail",
  ]).toLowerCase();

  const purchaseStatus = firstString(record, [
    "purchase_status",
    "purchaseStatus",
  ]).toLowerCase();

  return (
    status === "approved" ||
    status === "paid" ||
    purchaseStatus === "paid" ||
    statusDetail === "accredited"
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan variables Supabase de servidor.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function findOneByColumn(
  supabase: ReturnType<typeof getSupabaseClient>,
  table: string,
  column: string,
  requestId: string
): Promise<AnyRecord | null> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, requestId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as AnyRecord | null) || null;
}

async function findPaymentRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord | null> {
  const { data, error } = await supabase
    .from("ptm_payments")
    .select("*")
    .eq("request_id", requestId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as AnyRecord | null) || null;
}

async function findAnalysisRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord | null> {
  const byRequestId = await findOneByColumn(
    supabase,
    "analysis_requests",
    "request_id",
    requestId
  );

  if (byRequestId) {
    return byRequestId;
  }

  if (isUuid(requestId)) {
    const byId = await findOneByColumn(
      supabase,
      "analysis_requests",
      "id",
      requestId
    );

    if (byId) {
      return byId;
    }
  }

  return null;
}

function mergeRecords(payment: AnyRecord | null, analysis: AnyRecord | null): AnyRecord {
  return {
    ...(analysis || {}),
    ...(payment || {}),
  };
}

async function insertEmailEvent(
  supabase: ReturnType<typeof getSupabaseClient>,
  data: {
    requestId: string;
    email: string;
    type: string;
    provider?: string | null;
    providerId?: string | null;
    outbox?: boolean;
    status: "sent" | "failed";
    message?: string | null;
    error?: string | null;
    metadata?: AnyRecord;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ptm_email_events").insert({
    request_id: data.requestId,
    email: data.email,
    type: data.type,
    provider: data.provider || null,
    provider_id: data.providerId || null,
    outbox: data.outbox || false,
    status: data.status,
    message: data.message || null,
    error: data.error || null,
    metadata: data.metadata || {},
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
  };
}

async function listEmailEvents(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord[]> {
  const { data, error } = await supabase
    .from("ptm_email_events")
    .select("*")
    .eq("request_id", requestId)
    .eq("type", "documents_ready")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data as AnyRecord[];
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse(
        {
          ok: false,
          error: "requestId requerido.",
        },
        400
      );
    }

    const supabase = getSupabaseClient();
    const events = await listEmailEvents(supabase, requestId);

    return jsonResponse({
      ok: true,
      requestId,
      type: "documents_ready",
      events,
      lastEvent: events[0] || null,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error consultando bitácora de correos.",
      },
      500
    );
  }
}
export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse(
        {
          ok: false,
          error: "requestId requerido.",
        },
        400
      );
    }

    const supabase = getSupabaseClient();

    const paymentRecord = await findPaymentRecord(supabase, requestId);
    const analysisRecord = await findAnalysisRecord(supabase, requestId);
    const record = mergeRecords(paymentRecord, analysisRecord);

    if (!paymentRecord && !analysisRecord) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "No se encontró la solicitud.",
        },
        404
      );
    }

    if (!isPaidRecord(record)) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          status: firstString(record, ["status", "payment_status", "raw_status"]),
          purchaseStatus: firstString(record, ["purchase_status"]),
          error: "No se envía correo de documentos listos porque la solicitud no figura pagada/aprobada.",
        },
        409
      );
    }

    const email = firstString(record, [
      "customer_email",
      "customerEmail",
      "email",
      "client_email",
      "clientEmail",
      "payer_email",
      "payerEmail",
    ]);

    if (!email || !email.includes("@")) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "La solicitud no tiene un email válido.",
        },
        400
      );
    }

    const name =
      firstString(record, [
        "customer_name",
        "customerName",
        "name",
        "client_name",
        "clientName",
        "payer_name",
        "payerName",
      ]) || "cliente";

    const plate = firstString(record, [
      "plate",
      "patente",
      "vehicle_plate",
      "vehiclePlate",
    ]);

    const amount = firstNumberOrString(record, [
      "amount",
      "payment_amount",
      "paymentAmount",
      "paid_amount",
      "paidAmount",
      "total_amount",
      "totalAmount",
    ]);

    const result = await sendClientDocumentsReady({
      name,
      email,
      requestId,
      amount,
      plate,
    });

    if (!result.ok) {
      const failedLog = await insertEmailEvent(supabase, {
        requestId,
        email,
        type: "documents_ready",
        provider: result.provider,
        providerId: result.id || null,
        outbox: result.outbox || false,
        status: "failed",
        error: result.error || "No se pudo enviar el correo.",
        metadata: {
          source: paymentRecord ? "ptm_payments" : "analysis_requests",
          plate: plate || null,
          amount: amount || null,
        },
      });

      return jsonResponse(
        {
          ok: false,
          requestId,
          email,
          provider: result.provider,
          error: result.error || "No se pudo enviar el correo de documentos listos.",
          logSaved: failedLog.ok,
          logError: failedLog.error || null,
        },
        500
      );
    }

    const logResult = await insertEmailEvent(supabase, {
      requestId,
      email,
      type: "documents_ready",
      provider: result.provider,
      providerId: result.id || null,
      outbox: result.outbox || false,
      status: "sent",
      message: "Correo de documentos listos enviado correctamente.",
      metadata: {
        source: paymentRecord ? "ptm_payments" : "analysis_requests",
        plate: plate || null,
        amount: amount || null,
      },
    });

    const events = await listEmailEvents(supabase, requestId);

    return jsonResponse({
      ok: true,
      requestId,
      email,
      source: paymentRecord ? "ptm_payments" : "analysis_requests",
      type: "documents_ready",
      provider: result.provider,
      id: result.id || null,
      outbox: result.outbox || false,
      logSaved: logResult.ok,
      logError: logResult.error || null,
      lastEvent: events[0] || null,
      message: "Correo de documentos listos enviado correctamente.",
    });
  } catch (error) {
    console.error("[ADMIN_SEND_DOCUMENTS_READY_ERROR]", error);

    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado enviando correo de documentos listos.",
      },
      500
    );
  }
}