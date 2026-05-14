import { NextResponse } from "next/server";
import { getStoredPayment } from "@/lib/storage/payment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId?: string;
  }>;
};

function cleanRequestId(value: unknown): string {
  if (typeof value !== "string") return "";

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function normalizeStatus(value: unknown): string {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!status) return "pending";

  if (["approved", "paid", "accredited"].includes(status)) return "approved";
  if (["rejected", "cancelled", "canceled", "failed"].includes(status)) return "rejected";
  if (["in_process", "in_process_payment", "processing"].includes(status)) return "in_process";
  if (["pending", "created"].includes(status)) return "pending";

  return status;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = cleanRequestId(params?.requestId);

    if (!requestId) {
      return NextResponse.json(
        {
          ok: false,
          found: false,
          requestId: "",
          status: "pending",
          error: "Falta requestId.",
        },
        { status: 400 }
      );
    }

    const payment = await getStoredPayment(requestId);

    if (!payment) {
      return NextResponse.json({
        ok: true,
        found: false,
        requestId,
        status: "pending",
        purchaseStatus: "pending",
        error: "No existe registro de pago para esta solicitud.",
      });
    }

    const status = normalizeStatus(payment.status);

    return NextResponse.json({
      ok: true,
      found: true,
      requestId,
      status,
      purchaseStatus: status === "approved" ? "paid" : status,
      payment: {
        requestId: payment.requestId,
        externalReference: payment.externalReference,
        status,
        rawStatus: payment.rawStatus || null,
        statusDetail: payment.statusDetail || null,
        amount: payment.amount,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        plate: payment.plate,
        mock: payment.mock,
        sandbox: payment.sandbox,
        preferenceId: payment.preferenceId,
        paymentId: payment.paymentId,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error("[PTM payment status] Error consultando estado:", error);

    return NextResponse.json(
      {
        ok: false,
        found: false,
        status: "pending",
        error: "No se pudo consultar el estado del pago.",
      },
      { status: 500 }
    );
  }
}