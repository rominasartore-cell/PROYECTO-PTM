export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (process.env.MOCK_PAYMENT === "true") {
      return Response.json({
        ok: true,
        mock: true,
        status: "PAYMENT_PENDING",
        requestId: body.requestId || null,
        message: "Pago mock creado. Mercado Pago no configurado.",
      });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return Response.json(
        {
          ok: false,
          error:
            "Mercado Pago no esta configurado. Active MOCK_PAYMENT=true o configure MERCADO_PAGO_ACCESS_TOKEN.",
        },
        { status: 501 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: "Integracion real de Mercado Pago pendiente.",
      },
      { status: 501 }
    );
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "Error creando pago." },
      { status: 500 }
    );
  }
}
