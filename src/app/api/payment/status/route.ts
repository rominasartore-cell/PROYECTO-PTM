import { NextRequest, NextResponse } from "next/server";
import { mercadoPagoPaymentClient } from "@/lib/mercadopago/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("payment_id") ?? searchParams.get("id");

  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid payment_id" }, { status: 400 });
  }

  try {
    const payment = await mercadoPagoPaymentClient().get({ id: paymentId });

    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference,
        transactionAmount: payment.transaction_amount,
        currencyId: payment.currency_id,
        paymentMethodId: payment.payment_method_id,
        paymentTypeId: payment.payment_type_id,
        dateApproved: payment.date_approved,
        payerEmail: payment.payer?.email,
      },
    });
  } catch (error) {
    console.error("[payment.status.error]", error);
    return NextResponse.json({ ok: false, error: "Could not verify payment status" }, { status: 502 });
  }
}
