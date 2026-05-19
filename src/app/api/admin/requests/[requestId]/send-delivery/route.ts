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

type DeliveryEmailSendResult = {
  ok: boolean;
  provider: string;
  id?: string | null;
  outbox?: boolean;
  error?: string;
};

const DELIVERY_BUCKET = process.env.PTM_DELIVERY_BUCKET?.trim() || "ptm-deliveries";
const LINK_TTL_SECONDS = 7 * 24 * 60 * 60;
const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT?.trim() ||
  process.env.SUPPORT_EMAIL?.trim() ||
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
  "contacto@prescribetumulta.cl";

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

function firstNumberOrString(record: AnyRecord | null | undefined, keys: string[]): number | string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }

  return null;
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

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  return `Prescribe tu Multa <${SUPPORT_EMAIL}>`;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }

  return 9990;
}

function formatCLP(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

async function findLatestDeliveryPath(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string,
  requestedPath: string
): Promise<string | null> {
  if (requestedPath && requestedPath.startsWith(`${requestId}/`) && requestedPath.toLowerCase().endsWith(".zip")) {
    return requestedPath;
  }

  const { data, error } = await supabase.storage.from(DELIVERY_BUCKET).list(requestId, {
    limit: 20,
    sortBy: {
      column: "created_at",
      order: "desc",
    },
  });

  if (error || !data) return null;

  const latest = data.find((item) => item.name.toLowerCase().endsWith(".zip"));
  return latest ? `${requestId}/${latest.name}` : null;
}

function buildDeliveryEmail(args: {
  email: string;
  name: string;
  requestId: string;
  plate: string;
  amount: number | string | null;
  downloadUrl: string;
  expiresAt: string;
}) {
  const safeName = escapeHtml(args.name || "cliente");
  const safeRequestId = escapeHtml(args.requestId);
  const safePlate = escapeHtml(args.plate || "No informada");
  const safeAmount = escapeHtml(formatCLP(args.amount));
  const safeDownloadUrl = escapeHtml(args.downloadUrl);
  const safeExpiresAt = escapeHtml(args.expiresAt);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  const subject = "Tus documentos estan listos - Prescribe tu Multa";

  const text = [
    `Hola ${args.name || "cliente"},`,
    "",
    "Tu informe y documentacion asociada ya fueron preparados.",
    "",
    `N de solicitud: ${args.requestId}`,
    `Patente: ${args.plate || "No informada"}`,
    `Monto pagado: ${formatCLP(args.amount)}`,
    "",
    "Descarga privada:",
    args.downloadUrl,
    "",
    `Este link expira el ${args.expiresAt}.`,
    "",
    "Que incluye esta entrega:",
    "- Informe de analisis de multas.",
    "- Detalle de multas revisadas.",
    "- Borrador de solicitud de prescripcion, cuando corresponda.",
    "- Guia de tramitacion personal.",
    "",
    `Si tienes dudas, responde este correo o escribe a ${SUPPORT_EMAIL} indicando tu N de solicitud.`,
    "",
    "Disclaimer legal:",
    "El informe y los documentos entregados son material de apoyo juridico. No garantizan que el tribunal acoja la solicitud ni que las multas sean eliminadas automaticamente.",
    "",
    "Prescribe tu Multa",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f766e;padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:.9;">Prescribe tu Multa</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">Tus documentos estan listos</h1>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#ccfbf1;">Preparamos la documentacion asociada a tu solicitud.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
                  Hola <strong>${safeName}</strong>, tu informe y documentos asociados ya fueron preparados.
                </p>

                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:20px 0;border-collapse:separate;border-spacing:0;border:1px solid #dbe4ee;border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">N de solicitud</td>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${safeRequestId}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Patente</td>
                    <td style="padding:14px 16px;font-size:14px;color:#0f172a;text-align:right;font-weight:700;border-bottom:1px solid #e2e8f0;">${safePlate}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:13px;color:#475569;">Monto pagado</td>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:16px;color:#0f172a;text-align:right;font-weight:800;">${safeAmount} CLP</td>
                  </tr>
                </table>

                <div style="margin:24px 0;padding:18px;border-radius:14px;background:#ecfdf5;border:1px solid #bbf7d0;">
                  <h2 style="margin:0 0 10px;font-size:17px;color:#065f46;">Descarga privada</h2>
                  <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#064e3b;">El link es temporal y expira el <strong>${safeExpiresAt}</strong>.</p>
                  <a href="${safeDownloadUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:800;">Descargar documentos</a>
                </div>

                <div style="margin:24px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <h2 style="margin:0 0 10px;font-size:17px;color:#334155;">Que incluye esta entrega</h2>
                  <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.7;">
                    <li>Informe de analisis de multas.</li>
                    <li>Detalle de multas revisadas.</li>
                    <li>Borrador de solicitud de prescripcion, cuando corresponda.</li>
                    <li>Guia de tramitacion personal.</li>
                  </ul>
                </div>

                <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;">
                  <h2 style="margin:0 0 8px;font-size:15px;color:#9a3412;">Importante</h2>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#7c2d12;">
                    Si tienes dudas, responde este correo o escribe a <strong>${safeSupportEmail}</strong> indicando tu N de solicitud.
                  </p>
                </div>

                <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <h2 style="margin:0 0 8px;font-size:15px;color:#334155;">Disclaimer legal</h2>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#475569;">
                    El informe y los documentos entregados son material de apoyo juridico. No garantizan que el tribunal acoja la solicitud ni que las multas sean eliminadas automaticamente.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">Prescribe tu Multa - Contacto: ${safeSupportEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<DeliveryEmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      provider: "none",
      error: "RESEND_API_KEY no configurada.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  const result = (await response.json().catch(() => null)) as AnyRecord | null;

  if (!response.ok) {
    return {
      ok: false,
      provider: "resend",
      error: firstString(result, ["message", "error"]) || `Resend respondio HTTP ${response.status}.`,
    };
  }

  return {
    ok: true,
    provider: "resend",
    id: firstString(result, ["id"]),
  };
}

async function saveToOutbox(
  supabase: ReturnType<typeof getSupabaseClient>,
  args: {
    to: string;
    subject: string;
    html: string;
    text: string;
    metadata: AnyRecord;
    reason: string;
  }
): Promise<DeliveryEmailSendResult> {
  const now = new Date().toISOString();

  const rows: Array<AnyRecord> = [
    {
      to_email: args.to,
      from_email: getEmailFrom(),
      subject: args.subject,
      html: args.html,
      text: args.text,
      status: "pending",
      type: "delivery_sent",
      provider: "emails_outbox",
      error: args.reason,
      metadata: args.metadata,
      created_at: now,
      updated_at: now,
    },
    {
      to_email: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      status: "pending",
      type: "delivery_sent",
      metadata: args.metadata,
      created_at: now,
    },
    {
      email: args.to,
      subject: args.subject,
      body: args.html,
      status: "pending",
      metadata: args.metadata,
      created_at: now,
    },
  ];

  let lastError = "";

  for (const row of rows) {
    const { error } = await supabase.from("emails_outbox").insert(row);

    if (!error) {
      return {
        ok: true,
        provider: "emails_outbox",
        outbox: true,
      };
    }

    lastError = error.message;
  }

  return {
    ok: false,
    provider: "none",
    error: lastError || "No se pudo guardar en emails_outbox.",
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
): Promise<void> {
  try {
    await supabase.from("ptm_email_events").insert({
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
  } catch (error) {
    console.warn("[PTM_DELIVERY_EMAIL_EVENT_WARNING]", error);
  }
}

async function markManagementStatusDocumentsSent(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabase.from("ptm_request_management_status").upsert(
      {
        request_id: requestId,
        status: "documents_sent",
        note: "Entrega enviada al cliente con link privado.",
        updated_by: "admin",
        metadata: {
          source: "send_delivery_endpoint",
        },
        updated_at: now,
      },
      {
        onConflict: "request_id",
      }
    );
  } catch (error) {
    console.warn("[PTM_MANAGEMENT_STATUS_DELIVERY_WARNING]", error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse({ ok: false, error: "requestId requerido." }, 400);
    }

    const body = (await request.json().catch(() => ({}))) as AnyRecord;
    const requestedDeliveryPath = getString(body.deliveryPath);

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
          error: "No se envia entrega porque la solicitud no figura pagada/aprobada.",
        },
        409
      );
    }

    const email = normalizeEmail(
      firstString(record, [
        "customer_email",
        "customerEmail",
        "email",
        "client_email",
        "clientEmail",
        "payer_email",
        "payerEmail",
      ])
    );

    if (!email || !email.includes("@")) {
      return jsonResponse({ ok: false, requestId, error: "La solicitud no tiene email valido." }, 400);
    }

    const deliveryPath = await findLatestDeliveryPath(supabase, requestId, requestedDeliveryPath);

    if (!deliveryPath) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "No hay ZIP de entrega subido para esta solicitud.",
        },
        404
      );
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(DELIVERY_BUCKET)
      .createSignedUrl(deliveryPath, LINK_TTL_SECONDS, {
        download: true,
      });

    if (signedError || !signed?.signedUrl) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: signedError?.message || "No se pudo crear link privado de descarga.",
        },
        500
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

    const plate = firstString(record, ["plate", "patente", "vehicle_plate", "vehiclePlate"]);
    const amount = firstNumberOrString(record, [
      "amount",
      "payment_amount",
      "paymentAmount",
      "paid_amount",
      "paidAmount",
      "total_amount",
      "totalAmount",
    ]);

    const expiresAt = new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Santiago",
    }).format(new Date(Date.now() + LINK_TTL_SECONDS * 1000));

    const emailPayload = buildDeliveryEmail({
      email,
      name,
      requestId,
      plate,
      amount,
      downloadUrl: signed.signedUrl,
      expiresAt,
    });

    const resend = await sendViaResend({
      to: email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
    });

    let result: DeliveryEmailSendResult = resend;

    if (!resend.ok) {
      result = await saveToOutbox(supabase, {
        to: email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        metadata: {
          requestId,
          deliveryPath,
          bucket: DELIVERY_BUCKET,
        },
        reason: resend.error || "Resend no disponible.",
      });
    }

    if (!result.ok) {
      await insertEmailEvent(supabase, {
        requestId,
        email,
        type: "delivery_sent",
        provider: result.provider,
        providerId: null,
        outbox: false,
        status: "failed",
        error: result.error || "No se pudo enviar entrega.",
        metadata: {
          bucket: DELIVERY_BUCKET,
          deliveryPath,
        },
      });

      return jsonResponse(
        {
          ok: false,
          requestId,
          email,
          provider: result.provider,
          error: result.error || "No se pudo enviar entrega.",
        },
        500
      );
    }

    await insertEmailEvent(supabase, {
      requestId,
      email,
      type: "delivery_sent",
      provider: result.provider,
      providerId: typeof result.id === "string" ? result.id : null,
      outbox: Boolean(result.outbox),
      status: "sent",
      message: "Entrega enviada al cliente con link privado.",
      metadata: {
        bucket: DELIVERY_BUCKET,
        deliveryPath,
        expiresAt,
        plate: plate || null,
        amount: amount || null,
      },
    });

    await markManagementStatusDocumentsSent(supabase, requestId);

    return jsonResponse({
      ok: true,
      requestId,
      email,
      provider: result.provider,
      id: typeof result.id === "string" ? result.id : null,
      outbox: Boolean(result.outbox),
      bucket: DELIVERY_BUCKET,
      deliveryPath,
      expiresAt,
      message: "Entrega enviada al cliente con link privado.",
    });
  } catch (error) {
    console.error("[ADMIN_SEND_DELIVERY_ERROR]", error);

    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado enviando entrega.",
      },
      500
    );
  }
}
