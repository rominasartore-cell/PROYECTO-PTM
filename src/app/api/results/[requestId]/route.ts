import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getStoredPayment,
  savePaymentWebhookUpdate,
  type StoredPaymentStatus,
} from "@/lib/storage/payment-store";
import { sendClientPaymentConfirmed } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MercadoPagoWebhookBody = {
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  topic?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
  payment_id?: string | number;
  [key: string]: unknown;
};

function getAccessToken(): string | null {
  return (
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    null
  );
}

function getWebhookSecret(): string | null {
  return (
    process.env.MERCADO_PAGO_WEBHOOK_SECRET ||
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    process.env.MP_WEBHOOK_SECRET ||
    null
  );
}

function getHeader(request: Request, name: string): string {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || "";
}

function sanitizeId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  return String(value)
    .trim()
    .replace(/[^\w.-]/g, "")
    .slice(0, 160);
}

function parseSignatureHeader(value: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const part of value.split(",")) {
    const [key, ...rest] = part.split("=");
    const normalizedKey = key?.trim();
    const normalizedValue = rest.join("=").trim();

    if (normalizedKey && normalizedValue) {
      result[normalizedKey] = normalizedValue;
    }
  }

  return result;
}

function safeCompareHex(a: string, b: string): boolean {
  try {
    const aBuffer = Buffer.from(a, "hex");
    const bBuffer = Buffer.from(b, "hex");

    if (aBuffer.length !== bBuffer.length) return false;

    return timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

function buildSignatureManifest(params: {
  dataIdFromUrl: string;
  xRequestId: string;
  ts: string;
}): string {
  const parts: string[] = [];

  if (params.dataIdFromUrl) {
    parts.push(`id:${params.dataIdFromUrl.toLowerCase()};`);
  }

  if (params.xRequestId) {
    parts.push(`request-id:${params.xRequestId};`);
  }

  if (params.ts) {
    parts.push(`ts:${params.ts};`);
  }

  return parts.join("");
}

function validateMercadoPagoSignature(request: Request): {
  configured: boolean;
  valid: boolean;
  reason: string;
} {
  const secret = getWebhookSecret();

  if (!secret) {
    return {
      configured: false,
      valid: true,
      reason: "Webhook secret no configurado; validacion de firma omitida.",
    };
  }

  const url = new URL(request.url);
  const dataIdFromUrl = sanitizeId(url.searchParams.get("data.id"));
  const xSignature = getHeader(request, "x-signature");
  const xRequestId = getHeader(request, "x-request-id");

  if (!xSignature) {
    return {
      configured: true,
      valid: false,
      reason: "Falta header x-signature.",
    };
  }

  const signatureParts = parseSignatureHeader(xSignature);
  const ts = signatureParts.ts || "";
  const receivedHash = signatureParts.v1 || "";

  if (!ts || !receivedHash) {
    return {
      configured: true,
      valid: false,
      reason: "Firma incompleta: falta ts o v1.",
    };
  }

  const manifest = buildSignatureManifest({
    dataIdFromUrl,
    xRequestId,
    ts,
  });

  if (!manifest) {
    return {
      configured: true,
      valid: false,
      reason: "No hay datos suficientes para construir manifest de firma.",
    };
  }

  const calculatedHash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return {
    configured: true,
    valid: safeCompareHex(calculatedHash, receivedHash),
    reason: "Firma validada.",
  };
}

function extractEventType(request: Request, body: MercadoPagoWebhookBody): string {
  const url = new URL(request.url);

  return String(
    url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      body.type ||
      body.topic ||
      ""
  )
    .trim()
    .toLowerCase();
}

function extractPaymentId(request: Request, body: MercadoPagoWebhookBody): string {
  const url = new URL(request.url);

  return (
    sanitizeId(url.searchParams.get("data.id")) ||
    sanitizeId(url.searchParams.get("id")) ||
    sanitizeId(url.searchParams.get("payment_id")) ||
    sanitizeId(body?.data?.id) ||
    sanitizeId(body?.payment_id) ||
    sanitizeId(body?.id)
  );
}

function normalizePaymentStatus(status: unknown): StoredPaymentStatus {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved") return "approved";
  if (value === "pending" || value === "in_process" || value === "authorized") return "pending";
  if (value === "rejected") return "rejected";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  if (value === "refunded") return "refunded";
  if (value === "charged_back") return "charged_back";

  return "unknown";
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return {
      ok: false,
      status: 501,
      data: null,
      error: "Mercado Pago no esta configurado. Falta access token.",
    };
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: "No se pudo consultar el pago en Mercado Pago.",
    };
  }

  return {
    ok: true,
    status: response.status,
    data,
    error: "",
  };
}

function getPaymentEmail(payment: any, storedEmail?: string | null): string {
  return String(
    payment?.payer?.email ||
      payment?.metadata?.email ||
      storedEmail ||
      ""
  ).trim();
}

function getPaymentName(payment: any, storedName?: string | null): string {
  return String(
    payment?.metadata?.name ||
      payment?.payer?.first_name ||
      storedName ||
      "Cliente"
  ).trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as MercadoPagoWebhookBody;

    const eventType = extractEventType(request, body);
    const paymentId = extractPaymentId(request, body);
    const signature = validateMercadoPagoSignature(request);

    if (!signature.valid) {
      return Response.json(
        {
          ok: false,
          received: true,
          processed: false,
          error: "Firma de Mercado Pago invalida.",
          reason: signature.reason,
        },
        { status: 401 }
      );
    }

    if (eventType && eventType !== "payment") {
      return Response.json({
        ok: true,
        received: true,
        processed: false,
        ignored: true,
        reason: `Evento ignorado: ${eventType}`,
        signature,
      });
    }

    if (!paymentId) {
      return Response.json({
        ok: true,
        received: true,
        processed: false,
        error: "Webhook recibido, pero no se encontro paymentId.",
        eventType,
        signature,
        body,
      });
    }

    const paymentResult = await fetchMercadoPagoPayment(paymentId);

    if (!paymentResult.ok) {
      return Response.json({
        ok: true,
        received: true,
        processed: false,
        paymentId,
        eventType,
        signature,
        error: paymentResult.error,
        mercadoPagoStatus: paymentResult.status,
        mercadoPago: paymentResult.data,
      });
    }

    const payment = paymentResult.data as any;
    const normalizedStatus = normalizePaymentStatus(payment?.status);
    const externalReference =
      sanitizeId(payment?.external_reference) ||
      sanitizeId(payment?.metadata?.request_id);

    if (!externalReference) {
      return Response.json({
        ok: true,
        received: true,
        processed: false,
        paymentId,
        eventType,
        signature,
        error: "Pago consultado, pero no trae external_reference/request_id.",
        rawStatus: payment?.status,
      });
    }

    const existing = await getStoredPayment(externalReference);
    const alreadyApproved = existing?.status === "approved";
    const isApproved = normalizedStatus === "approved";
    const amount = Number(payment?.transaction_amount || existing?.amount || 0);
    const payerEmail = getPaymentEmail(payment, existing?.customerEmail);
    const payerName = getPaymentName(payment, existing?.customerName);

    const stored = await savePaymentWebhookUpdate({
      requestId: externalReference,
      externalReference,
      paymentId,
      status: normalizedStatus,
      rawStatus: payment?.status || "",
      statusDetail: payment?.status_detail || "",
      amount,
      payerEmail,
      mercadoPago: {
        id: payment?.id,
        status: payment?.status,
        status_detail: payment?.status_detail,
        transaction_amount: payment?.transaction_amount,
        external_reference: payment?.external_reference,
        date_approved: payment?.date_approved,
      },
      metadata: {
        payment_method_id: payment?.payment_method_id || "",
        payment_type_id: payment?.payment_type_id || "",
        date_approved: payment?.date_approved || "",
      },
    });

    let paymentEmailSent = false;

    if (isApproved && !alreadyApproved && payerEmail) {
      try {
        await sendClientPaymentConfirmed({
          name: payerName,
          email: payerEmail,
          requestId: externalReference,
          amount,
        });

        paymentEmailSent = true;
      } catch (error) {
        console.error("[PTM webhook] Error enviando confirmacion de pago:", error);
      }
    }

    console.log("[PTM Mercado Pago webhook]", {
      paymentId,
      externalReference,
      status: payment?.status,
      statusDetail: payment?.status_detail,
      approved: isApproved,
      amount,
      payerEmail,
      paymentEmailSent,
    });

    return Response.json({
      ok: true,
      received: true,
      processed: true,
      paymentConfirmed: isApproved,
      paymentEmailSent,
      paymentId,
      requestId: externalReference,
      externalReference,
      status: normalizedStatus,
      rawStatus: payment?.status,
      statusDetail: payment?.status_detail,
      amount,
      payerEmail,
      signature,
      stored: {
        requestId: stored.requestId,
        status: stored.status,
        paymentId: stored.paymentId,
        paidAt: stored.paidAt || "",
        updatedAt: stored.updatedAt,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        received: false,
        processed: false,
        error: error?.message || "Error procesando webhook de Mercado Pago.",
      },
      { status: 500 }
    );
  }
}
