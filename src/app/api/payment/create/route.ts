export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentBody = {
  requestId?: string;
  name?: string;
  email?: string;
  plate?: string;
  totalMultas?: number;
  multasSusceptibles?: number;
  montoPotencial?: number;
  montoPotencialUtm?: number;
  valorUtm?: number;
  analysisResult?: any;
  result?: any;
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
  return ["true", "1", "yes", "si", "sí"].includes((value || "").toLowerCase().trim());
}

function shouldUseSandbox(accessToken: string): boolean {
  return accessToken.trim().startsWith("TEST-") || isTruthyEnv(process.env.MERCADO_PAGO_USE_SANDBOX);
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
      if (description) parts.push(`${code}${description}`);
    }
  }

  return parts.filter(Boolean).join(" | ");
}

function sanitizeText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;

  return value
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

function createRequestId(body: PaymentBody): string {
  const existing = sanitizeText(body.requestId, "");

  if (existing) return existing;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ptm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PaymentBody;

    const requestId = createRequestId(body);
    const siteUrl = getSiteUrl(request);

    const reportPriceClp = getEnvNumber("REPORT_PRICE_CLP", 9990);

    const name = sanitizeText(body.name, "Cliente");
    const email = sanitizeEmail(body.email);
    const plate = sanitizeText(body.plate, "SIN-PATENTE");

    const sourceResult = body.analysisResult || body.result || body;

    const totalMultas = Number(sourceResult.totalMultas ?? body.totalMultas ?? 0);
    const multasSusceptibles = Number(
      sourceResult.multasSusceptibles ?? body.multasSusceptibles ?? 0
    );
    const montoPotencial = Number(
      sourceResult.montoPotencial ?? body.montoPotencial ?? 0
    );
    const montoPotencialUtm = Number(
      sourceResult.montoPotencialUtm ?? body.montoPotencialUtm ?? 0
    );
    const valorUtm = Number(sourceResult.valorUtm ?? body.valorUtm ?? 0);

    if (!email) {
      return Response.json(
        {
          ok: false,
          error: "Correo inválido o ausente. No se puede crear el pago.",
        },
        { status: 400 }
      );
    }

    if (multasSusceptibles <= 0) {
      return Response.json(
        {
          ok: false,
          error:
            "No hay multas revisables/potencialmente prescritas. Compra no disponible.",
          requestId,
        },
        { status: 400 }
      );
    }

    if (process.env.MOCK_PAYMENT === "true") {
      return Response.json({
        ok: true,
        mock: true,
        status: "PAYMENT_PENDING",
        requestId,
        checkoutUrl: `${siteUrl}/resultados/${requestId}?mock=true&status=approved`,
        init_point: `${siteUrl}/resultados/${requestId}?mock=true&status=approved`,
        sandbox_init_point: `${siteUrl}/resultados/${requestId}?mock=true&status=approved`,
        message: "Pago mock creado. Mercado Pago no configurado.",
      });
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      return Response.json(
        {
          ok: false,
          error:
            "Mercado Pago no está configurado. Define MERCADO_PAGO_ACCESS_TOKEN en .env.local o activa MOCK_PAYMENT=true.",
        },
        { status: 501 }
      );
    }

    const preferencePayload = {
      items: [
        {
          id: "informe-prescripcion-tag",
          title: "Informe de prescripción de multas de tránsito",
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
        success: `${siteUrl}/resultados/${requestId}?status=success`,
        pending: `${siteUrl}/resultados/${requestId}?status=pending`,
        failure: `${siteUrl}/resultados/${requestId}?status=failure`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/payment/webhook`,
      external_reference: requestId,
      statement_descriptor: "PRESCRIBE MULTA",
      metadata: {
        request_id: requestId,
        name,
        email,
        plate,
        total_multas: totalMultas,
        multas_susceptibles: multasSusceptibles,
        monto_potencial: montoPotencial,
        monto_potencial_utm: montoPotencialUtm,
        valor_utm: valorUtm,
      },
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
            ? `Mercado Pago rechazó la creación de la preferencia: ${mpError}`
            : "Mercado Pago rechazó la creación de la preferencia.",
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
          error: "Mercado Pago creó la preferencia, pero no devolvió link de checkout.",
          mercadoPago: mpData,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      mock: false,
      sandbox: shouldUseSandbox(accessToken),
      status: "PAYMENT_CREATED",
      requestId,
      preferenceId: mpData.id,
      checkoutUrl,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      external_reference: requestId,
      amount: reportPriceClp,
      mercadoPago: {
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        external_reference: mpData.external_reference,
      },
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "Error creando pago." },
      { status: 500 }
    );
  }
}
