import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendClientAnalysisResults,
  sendClientPaymentConfirmed,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

type AnalysisRequestEmailRow = {
  customer_name: string | null;
  customer_email: string | null;
  fine_count: number | null;
  prescribed_count: number | null;
  payment_status: string | null;
  purchase_status: string | null;
  payment_amount: number | string | null;
};

type PaymentEmailRow = {
  request_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string | null;
  amount: number | string | null;
};

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function moneyAmount(value: unknown, fallback = 9990): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return fallback;
}

async function findAnalysisRequest(requestId: string) {
  const result = (await supabaseAdmin
    .from("analysis_requests")
    .select(
      "customer_name, customer_email, fine_count, prescribed_count, payment_status, purchase_status, payment_amount"
    )
    .eq("request_id", requestId)
    .maybeSingle()) as unknown as {
    data: AnalysisRequestEmailRow | null;
    error: { message?: string } | null;
  };

  return result;
}

async function findPaymentRecord(requestId: string) {
  const result = (await supabaseAdmin
    .from("ptm_payments")
    .select("request_id, customer_name, customer_email, status, amount")
    .eq("request_id", requestId)
    .maybeSingle()) as unknown as {
    data: PaymentEmailRow | null;
    error: { message?: string } | null;
  };

  return result;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Falta el ID de solicitud" },
        { status: 400 }
      );
    }

    const analysisResult = await findAnalysisRequest(requestId);

    if (analysisResult.error) {
      console.error("[resend-email] analysis_requests DB error:", analysisResult.error);
      return NextResponse.json(
        { ok: false, error: "Error al consultar la solicitud" },
        { status: 500 }
      );
    }

    const analysis = analysisResult.data;

    if (analysis) {
      if (!analysis.customer_email) {
        return NextResponse.json(
          { ok: false, error: "La solicitud no tiene correo del cliente" },
          { status: 422 }
        );
      }

      const name = analysis.customer_name || "Cliente";
      const paymentStatus = normalizeStatus(analysis.payment_status);
      const purchaseStatus = normalizeStatus(analysis.purchase_status);
      const isPaid =
        paymentStatus === "approved" ||
        purchaseStatus === "paid" ||
        purchaseStatus === "completed";

      if (isPaid) {
        await sendClientPaymentConfirmed({
          name,
          email: analysis.customer_email,
          requestId,
          amount: moneyAmount(analysis.payment_amount, 9990),
        });

        return NextResponse.json({
          ok: true,
          source: "analysis_requests",
          type: "payment_confirmation",
          message: "Correo de confirmacion de compra reenviado correctamente",
        });
      }

      if (analysis.fine_count == null) {
        return NextResponse.json(
          {
            ok: false,
            error: "La solicitud no tiene resultados de analisis para enviar",
          },
          { status: 422 }
        );
      }

      await sendClientAnalysisResults({
        name,
        email: analysis.customer_email,
        requestId,
        prescribedCount: analysis.prescribed_count ?? 0,
        totalCount: analysis.fine_count,
      });

      return NextResponse.json({
        ok: true,
        source: "analysis_requests",
        type: "analysis_results",
        message: "Correo de resultados preliminares reenviado correctamente",
      });
    }

    const paymentResult = await findPaymentRecord(requestId);

    if (paymentResult.error) {
      console.error("[resend-email] ptm_payments DB error:", paymentResult.error);
      return NextResponse.json(
        { ok: false, error: "Error al consultar el pago" },
        { status: 500 }
      );
    }

    const payment = paymentResult.data;

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Solicitud o pago no encontrado" },
        { status: 404 }
      );
    }

    if (!payment.customer_email) {
      return NextResponse.json(
        { ok: false, error: "El pago no tiene correo del cliente" },
        { status: 422 }
      );
    }

    const paymentStatus = normalizeStatus(payment.status);

    if (paymentStatus !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          error: `El pago existe, pero no está aprobado. Estado actual: ${paymentStatus || "sin estado"}`,
        },
        { status: 409 }
      );
    }

    await sendClientPaymentConfirmed({
      name: payment.customer_name || "Cliente",
      email: payment.customer_email,
      requestId,
      amount: moneyAmount(payment.amount, 9990),
    });

    return NextResponse.json({
      ok: true,
      source: "ptm_payments",
      type: "payment_confirmation",
      message: "Correo de confirmacion de compra reenviado correctamente",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al reenviar el correo";
    console.error("[resend-email] Error:", err);

    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}

