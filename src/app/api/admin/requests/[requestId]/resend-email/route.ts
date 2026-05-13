import { NextResponse } from "next/server";
import { getStoredPayment } from "@/lib/storage/payment-store";
import { sendClientPaymentConfirmed } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId?: string;
  }>;
};

function cleanText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function cleanRequestId(value: unknown): string {
  if (typeof value !== "string") return "";

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function normalizeStatus(value: unknown): string {
  const status = cleanText(value).toLowerCase();

  if (["approved", "paid", "accredited"].includes(status)) return "approved";
  if (["pending", "created"].includes(status)) return "pending";
  if (["rejected", "cancelled", "canceled", "failed"].includes(status)) return "rejected";
  if (["in_process", "processing"].includes(status)) return "in_process";

  return status || "pending";
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = cleanRequestId(params?.requestId);

    if (!requestId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta requestId.",
        },
        { status: 400 }
      );
    }

    const payment = await getStoredPayment(requestId);

    if (!payment) {
      return NextResponse.json(
        {
          ok: false,
          requestId,
          error: "No existe pago asociado a esta solicitud.",
        },
        { status: 404 }
      );
    }

    const status = normalizeStatus(payment.status);

    if (status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          requestId,
          status,
          error: "El pago no esta aprobado. No corresponde reenviar confirmacion de compra.",
        },
        { status: 409 }
      );
    }

    const customerEmail = cleanText(payment.customerEmail);

    if (!customerEmail) {
      return NextResponse.json(
        {
          ok: false,
          requestId,
          error: "El pago aprobado no tiene correo de cliente.",
        },
        { status: 400 }
      );
    }

    await sendClientPaymentConfirmed({
      requestId,
      name: cleanText(payment.customerName, "Cliente"),
      email: customerEmail,
      amount: Number(payment.amount || 9990),
    });

    return NextResponse.json({
      ok: true,
      source: "ptm_payments",
      type: "payment_confirmation",
      requestId,
      message: "Correo de confirmacion de compra reenviado correctamente",
    });
  } catch (error: any) {
    console.error("[api/admin/requests/resend-email] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "No se pudo reenviar el correo de confirmacion.",
      },
      { status: 500 }
    );
  }
}