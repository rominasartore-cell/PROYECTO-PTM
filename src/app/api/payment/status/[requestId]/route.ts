import { getStoredPayment } from "@/lib/storage/payment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

function normalizePublicStatus(status?: string) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved") return "approved";

  if (
    value === "pending" ||
    value === "created" ||
    value === "unknown" ||
    value === "mock"
  ) {
    return "pending";
  }

  if (
    value === "rejected" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "refunded" ||
    value === "charged_back"
  ) {
    return "rejected";
  }

  return "pending";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const payment = await getStoredPayment(requestId);

    if (!payment) {
      return Response.json(
        {
          ok: false,
          found: false,
          requestId,
          status: "pending",
          error: "No existe registro local de pago para esta solicitud.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      found: true,
      requestId,
      status: normalizePublicStatus(payment.status),
      storedStatus: payment.status,
      paymentId: payment.paymentId || "",
      preferenceId: payment.preferenceId || "",
      amount: payment.amount || 0,
      customerEmail: payment.customerEmail || payment.payerEmail || "",
      customerName: payment.customerName || "",
      plate: payment.plate || "",
      product: payment.product || "",
      mock: Boolean(payment.mock),
      sandbox: Boolean(payment.sandbox),
      paidAt: payment.paidAt || "",
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        found: false,
        status: "pending",
        error: error?.message || "Error consultando estado de pago.",
      },
      { status: 500 }
    );
  }
}
