import { NextRequest, NextResponse } from "next/server";
import { mercadoPagoPaymentClient } from "@/lib/mercadopago/client";
import { getWebhookSecret } from "@/lib/mercadopago/env";
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago/webhook-signature";

export const runtime = "nodejs";

type MercadoPagoWebhookBody = {
  id?: number | string;
  live_mode?: boolean;
  type?: string;
  action?: string;
  data?: { id?: number | string };
  topic?: string;
};

async function readJsonSafely(request: NextRequest): Promise<MercadoPagoWebhookBody> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as MercadoPagoWebhookBody;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const body = await readJsonSafely(request);

  const dataIdFromUrl = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const dataIdFromBody = body.data?.id ? String(body.data.id) : undefined;
  const paymentId = dataIdFromUrl ?? dataIdFromBody;

  const secret = getWebhookSecret();
  if (secret) {
    const verification = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: dataIdFromUrl ?? null,
      secret,
    });

    if (!verification.ok) {
      console.warn("[mercadopago.webhook.invalid_signature]", verification.reason);
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const topic = url.searchParams.get("topic") ?? body.type ?? body.topic;

  try {
    if (topic === "payment" && paymentId && /^\d+$/.test(paymentId)) {
      const payment = await mercadoPagoPaymentClient().get({ id: paymentId });

      console.info("[mercadopago.webhook.payment]", {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference,
        transactionAmount: payment.transaction_amount,
        payerEmail: payment.payer?.email,
      });

      // PRODUCCIÓN: aquí debes actualizar tu DB y disparar el envío del informe/escritos
      // solo si payment.status === "approved" y el monto/reference coinciden con tu orden.
    } else {
      console.info("[mercadopago.webhook.received]", { topic, paymentId, body });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[mercadopago.webhook.error]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
