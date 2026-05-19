import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

type AnyRecord = Record<string, unknown>;

const DELIVERY_BUCKET = process.env.PTM_DELIVERY_BUCKET?.trim() || "ptm-deliveries";
const MAX_ZIP_BYTES = 25 * 1024 * 1024;

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
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function isPaidRecord(record: AnyRecord | null | undefined): boolean {
  if (!record) return false;

  const status = firstString(record, ["status", "payment_status", "raw_status", "rawStatus"]).toLowerCase();
  const statusDetail = firstString(record, ["status_detail", "statusDetail"]).toLowerCase();
  const purchaseStatus = firstString(record, ["purchase_status", "purchaseStatus"]).toLowerCase();

  return status === "approved" || status === "paid" || purchaseStatus === "paid" || statusDetail === "accredited";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function safeFileName(value: string): string {
  const cleaned = String(value || "entrega.zip")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return cleaned.toLowerCase().endsWith(".zip") ? cleaned : `${cleaned || "entrega"}.zip`;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
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

  if (error) return null;
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

  if (error) return null;
  return (data as AnyRecord | null) || null;
}

async function findAnalysisRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord | null> {
  const byRequestId = await findOneByColumn(supabase, "analysis_requests", "request_id", requestId);
  if (byRequestId) return byRequestId;

  if (isUuid(requestId)) {
    const byId = await findOneByColumn(supabase, "analysis_requests", "id", requestId);
    if (byId) return byId;
  }

  return null;
}

function mergeRecords(payment: AnyRecord | null, analysis: AnyRecord | null): AnyRecord {
  return {
    ...(analysis || {}),
    ...(payment || {}),
  };
}

async function ensureDeliveryBucket(supabase: ReturnType<typeof getSupabaseClient>) {
  const { data } = await supabase.storage.getBucket(DELIVERY_BUCKET);

  if (data) return;

  await supabase.storage.createBucket(DELIVERY_BUCKET, {
    public: false,
    fileSizeLimit: MAX_ZIP_BYTES,
    allowedMimeTypes: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  });
}

async function insertEvent(
  supabase: ReturnType<typeof getSupabaseClient>,
  payload: AnyRecord
): Promise<void> {
  try {
    await supabase.from("ptm_email_events").insert(payload);
  } catch (error) {
    console.warn("[PTM_DELIVERY_EVENT_WARNING]", error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse({ ok: false, error: "requestId requerido." }, 400);
    }

    const supabase = getSupabaseClient();
    await ensureDeliveryBucket(supabase);

    const { data, error } = await supabase.storage.from(DELIVERY_BUCKET).list(requestId, {
      limit: 20,
      sortBy: {
        column: "created_at",
        order: "desc",
      },
    });

    if (error) {
      return jsonResponse({ ok: false, requestId, error: error.message }, 500);
    }

    const files = (data || []).filter((item) => !item.name.startsWith("."));

    return jsonResponse({
      ok: true,
      requestId,
      bucket: DELIVERY_BUCKET,
      files: files.map((item) => ({
        name: item.name,
        path: `${requestId}/${item.name}`,
        size: item.metadata?.size || null,
        createdAt: item.created_at || null,
        updatedAt: item.updated_at || null,
      })),
      latest: files[0]
        ? {
            name: files[0].name,
            path: `${requestId}/${files[0].name}`,
            size: files[0].metadata?.size || null,
            createdAt: files[0].created_at || null,
            updatedAt: files[0].updated_at || null,
          }
        : null,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error consultando entrega.",
      },
      500
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse({ ok: false, error: "requestId requerido." }, 400);
    }

    const supabase = getSupabaseClient();

    const paymentRecord = await findPaymentRecord(supabase, requestId);
    const analysisRecord = await findAnalysisRecord(supabase, requestId);
    const record = mergeRecords(paymentRecord, analysisRecord);

    if (!paymentRecord && !analysisRecord) {
      return jsonResponse({ ok: false, requestId, error: "No se encontro la solicitud." }, 404);
    }

    if (!isPaidRecord(record)) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          status: firstString(record, ["status", "payment_status", "raw_status"]),
          purchaseStatus: firstString(record, ["purchase_status"]),
          error: "No se permite subir entrega porque la solicitud no figura pagada/aprobada.",
        },
        409
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file") || formData.get("zip") || formData.get("delivery");

    if (!uploadedFile || typeof (uploadedFile as File).arrayBuffer !== "function") {
      return jsonResponse({ ok: false, requestId, error: "Debes subir un archivo ZIP en el campo file." }, 400);
    }

    const file = uploadedFile as File;
    const fileName = safeFileName(file.name || "entrega.zip");

    if (file.size <= 0) {
      return jsonResponse({ ok: false, requestId, error: "El ZIP esta vacio." }, 400);
    }

    if (file.size > MAX_ZIP_BYTES) {
      return jsonResponse({ ok: false, requestId, error: "El ZIP excede el maximo permitido de 25 MB." }, 413);
    }

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return jsonResponse({ ok: false, requestId, error: "Solo se permite subir archivos ZIP." }, 400);
    }

    await ensureDeliveryBucket(supabase);

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${requestId}/delivery-${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage.from(DELIVERY_BUCKET).upload(path, buffer, {
      contentType: file.type || "application/zip",
      upsert: false,
    });

    if (uploadError) {
      return jsonResponse({ ok: false, requestId, error: uploadError.message }, 500);
    }

    await insertEvent(supabase, {
      request_id: requestId,
      email: firstString(record, ["customer_email", "customerEmail", "email", "payer_email", "payerEmail"]),
      type: "delivery_zip_uploaded",
      provider: "supabase_storage",
      provider_id: path,
      outbox: false,
      status: "sent",
      message: "ZIP de entrega subido correctamente.",
      metadata: {
        bucket: DELIVERY_BUCKET,
        path,
        fileName,
        size: file.size,
      },
    });

    return jsonResponse({
      ok: true,
      requestId,
      bucket: DELIVERY_BUCKET,
      path,
      fileName,
      size: file.size,
      message: "ZIP subido correctamente.",
    });
  } catch (error) {
    console.error("[ADMIN_DELIVERY_UPLOAD_ERROR]", error);

    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado subiendo ZIP.",
      },
      500
    );
  }
}
