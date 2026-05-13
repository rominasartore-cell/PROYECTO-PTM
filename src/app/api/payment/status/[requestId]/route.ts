import { randomUUID } from "node:crypto";
import { savePaymentCreated } from "@/lib/storage/payment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentBody = {
  requestId?: string;
  quoteToken?: string;
  name?: string;
  nombre?: string;
  email?: string;
  correo?: string;
  payerEmail?: string;
  plate?: string;
  patente?: string;
  totalMultas?: number;
  multasSusceptibles?: number;
  montoPotencial?: number;
  montoPotencialUtm?: number;
  valorUtm?: number;
  analysisResult?: any;
  result?: any;
  product?: string;
  amount?: number;
};

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];

  if (!raw) return fallback;

  const parsed = Number(
    raw
      .toString()
      .trim()
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSiteUrl(request: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL;

  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv.replace(/\/$/, "");
    return `https://${fromEnv}`.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`.replace(/\/$/, "");
}

function getAccessToken(): string | null {
  return (
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    null
  );
}

function isTruthyEnv(value: string | undefined): boolean {
  return ["true", "1", "yes", "si"].includes((value || "").toLowerCase().trim());
}

function shouldUseSandbox(accessToken: string): boolean {
  return (
    accessToken.trim().startsWith("TEST-") ||
    isTruthyEnv(process.env.MERCADO_PAGO_USE_SANDBOX)
  );
}

function pickCheckoutUrl(mpData: any, accessToken: string): string | null {
  const sandbox = shouldUseSandbox(accessToken);

  if (sandbox) {
    return mpData?.sandbox_init_point || mpData?.init_point || null;
  }

  return mpData?.init_point || mpData?.sandbox_init_point || null;
}

function formatMercadoPagoError(mpData: any): string {
  const parts: string[] = [];

  if (typeof mpData?.message === "string") parts.push(mpData.message);
  if (typeof mpData?.error === "string") parts.push(mpData.error);

  if (Array.isArray(mpData?.cause)) {
    for (const cause of mpData.cause) {
      const code = cause?.code ? `[${cause.code}] ` : "";
      const description = cause?.description || cause?.message;

      if (description) {
        parts.push(`${code}${description}`);
      }
    }
  }

  return parts.filter(Boolean).join(" | ");
}

function sanitizeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string" && typeof value !== "number") return fallback;

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 250);
}

function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return email;
}

function numberFrom(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function createRequestId(body: PaymentBody): string {
  const existing =
    sanitizeText(body.requestId, "") ||
    sanitizeText(body.quoteToken, "");

  if (existing) return existing;

  return randomUUID();
}

function buildResultUrl(
  siteUrl: string,
  requestId: string,
  status: "approved" | "pending" | "rejected",
  email: string,
  mock = false
): string {
  const params = new URLSearchParams();

  params.set("status", status);

  if (email) {
    params.set("email", email);
  }

  if (mock) {
    params.set("mock", "true");
  }

  return `${siteUrl}/resultados/${encodeURIComponent(requestId)}?${params.toString()}`;
}

async function persistPaymentCreated(params: {
  requestId: string;
  externalReference: string;
  status: "created" | "approved" | "pending";
  amount: number;
  customerEmail: string;
  customerName: string;
  plate: string;
  product: string;
  checkoutUrl: string;
  sandbox: boolean;
  mock: boolean;
  preferenceId?: string | null;
  siteUrl: string;
  urls: {
    success: string;
    pending: string;
    failure: string;
    webhook: string;
  };
  metadata: Record<string, unknown>;
  mercadoPago?: Record<string, unknown>;
}) {
  await savePaymentCreated({
    requestId: params.requestId,
    externalReference: params.externalReference,
    preferenceId: params.preferenceId || null,
    status: params.status,
    amount: params.amount,
    customerEmail: params.customerEmail,
    payerEmail: params.customerEmail,
    customerName: params.customerName,
    plate: params.plate,
    product: params.product,
    checkoutUrl: params.checkoutUrl,
    sandbox: params.sandbox,
    mock: params.mock,
    urls: params.urls,
    metadata: params.metadata,
    mercadoPago: params.mercadoPago || {},
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PaymentBody;

    const requestId = createRequestId(body);
    const siteUrl = getSiteUrl(request);

    const reportPriceClp = getEnvNumber("REPORT_PRICE_CLP", 9990);

    const name = sanitizeText(body.name ?? body.nombre, "Cliente");
    const email = sanitizeEmail(body.email ?? body.correo ?? body.payerEmail);
    const plate = sanitizeText(body.plate ?? body.patente, "SIN-PATENTE");
    const product = sanitizeText(body.product, "informe-completo-prescripcion");

    const sourceResult = body.analysisResult || body.result || body;

    const totalMultas = numberFrom(sourceResult.totalMultas ?? body.totalMultas);
    const multasSusceptibles = numberFrom(
      sourceResult.multasSusceptibles ?? body.multasSusceptibles
    );
    const montoPotencial = numberFrom(
      sourceResult.montoPotencial ?? body.montoPotencial
    );
    const montoPotencialUtm = numberFrom(
      sourceResult.montoPotencialUtm ?? body.montoPotencialUtm
    );
    const valorUtm = numberFrom(sourceResult.valorUtm ?? body.valorUtm);

    if (!email) {
      return Response.json(
        {
          ok: false,
          error: "Correo invalido o ausente. No se puede crear el pago.",
        },
        { status: 400 }
      );
    }

    if (multasSusceptibles <= 0) {
      return Response.json(
        {
          ok: false,
          error:
            "No hay multas revisables o potencialmente prescritas. Compra no disponible.",
          requestId,
        },
        { status: 400 }
      );
    }

    const successUrl = buildResultUrl(siteUrl, requestId, "approved", email);
    const pendingUrl = buildResultUrl(siteUrl, requestId, "pending", email);
    const failureUrl = buildResultUrl(siteUrl, requestId, "rejected", email);
    const webhookUrl = `${siteUrl}/api/payment/webhook`;

    const commonMetadata = {
      request_id: requestId,
      name,
      email,
      plate,
      product,
      total_multas: totalMultas,
      multas_susceptibles: multasSusceptibles,
      monto_potencial: montoPotencial,
      monto_potencial_utm: montoPotencialUtm,
      valor_utm: valorUtm,
      report_price_clp: reportPriceClp,
    };

    const urls = {
      success: successUrl,
      pending: pendingUrl,
      failure: failureUrl,
      webhook: webhookUrl,
    };

    if (process.env.MOCK_PAYMENT === "true") {
      const mockUrl = buildResultUrl(siteUrl, requestId, "approved", email, true);

      await persistPaymentCreated({
        requestId,
        externalReference: requestId,
        status: "approved",
        amount: reportPriceClp,
        customerEmail: email,
        customerName: name,
        plate,
        product,
        checkoutUrl: mockUrl,
        sandbox: true,
        mock: true,
        preferenceId: null,
        siteUrl,
        urls: {
          ...urls,
          success: mockUrl,
        },
        metadata: commonMetadata,
      });

      return Response.json({
        ok: true,
        mock: true,
        sandbox: true,
        status: "PAYMENT_MOCK_CREATED",
        requestId,
        checkoutUrl: mockUrl,
        init_point: mockUrl,
        sandbox_init_point: mockUrl,
        external_reference: requestId,
        amount: reportPriceClp,
        message: "Pago de prueba creado. Mercado Pago no fue llamado.",
      });
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      return Response.json(
        {
          ok: false,
          error:
            "Mercado Pago no esta configurado. Define MERCADO_PAGO_ACCESS_TOKEN o activa MOCK_PAYMENT=true.",
        },
        { status: 501 }
      );
    }

    const preferencePayload = {
      items: [
        {
          id: "informe-prescripcion-tag",
          title: "Informe de prescripcion de multas de transito",
          description: `Informe completo para patente ${plate}`,
          quantity: 1,
          currency_id: "CLP",
          unit_price: reportPriceClp,
        },
      ],
      payer: {
        name,
        email,
      },
      back_urls: {
        success: successUrl,
        pending: pendingUrl,
        failure: failureUrl,
      },
      auto_return: "approved",
      notification_url: webhookUrl,
      external_reference: requestId,
      statement_descriptor: "PRESCRIBE MULTA",
      metadata: commonMetadata,
    };

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencePayload),
      }
    );

    const mpData = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok) {
      const mpError = formatMercadoPagoError(mpData);

      return Response.json(
        {
          ok: false,
          error: mpError
            ? `Mercado Pago rechazo la creacion de la preferencia: ${mpError}`
            : "Mercado Pago rechazo la creacion de la preferencia.",
          status: mpResponse.status,
          mercadoPago: mpData,
        },
        { status: 502 }
      );
    }

    const checkoutUrl = pickCheckoutUrl(mpData, accessToken);

    if (!checkoutUrl) {
      return Response.json(
        {
          ok: false,
          error:
            "Mercado Pago creo la preferencia, pero no devolvio link de checkout.",
          mercadoPago: mpData,
        },
        { status: 502 }
      );
    }

    const preferenceId = String(mpData?.id || "").trim();
    const sandbox = shouldUseSandbox(accessToken);

    await persistPaymentCreated({
      requestId,
      externalReference: requestId,
      status: "created",
      amount: reportPriceClp,
      customerEmail: email,
      customerName: name,
      plate,
      product,
      checkoutUrl,
      sandbox,
      mock: false,
      preferenceId,
      siteUrl,
      urls,
      metadata: commonMetadata,
      mercadoPago: {
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        external_reference: mpData.external_reference,
      },
    });

    return Response.json({
      ok: true,
      mock: false,
      sandbox,
      status: "PAYMENT_CREATED",
      requestId,
      preferenceId,
      checkoutUrl,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      external_reference: requestId,
      amount: reportPriceClp,
      urls,
      mercadoPago: {
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        external_reference: mpData.external_reference,
      },
    });
  } catch (error: any) {
    console.error("[api/payment/create] Error:", error);

    return Response.json(
      { ok: false, error: error?.message || "Error creando pago." },
      { status: 500 }
    );
  }
}
