import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { requestId } = await context.params;

  const url = new URL(request.url);
  const mock = url.searchParams.get("mock") === "true";
  const status = url.searchParams.get("status") || "approved";

  return NextResponse.json({
    ok: true,
    requestId,
    mock,
    status,
    paymentStatus: status,
    message:
      status === "approved"
        ? "Pago aprobado correctamente en modo mock."
        : "Resultado disponible en modo mock.",
    result: {
      requestId,
      estado: status === "approved" ? "aprobado" : "pendiente",
      titulo: "Resultado de solicitud",
      descripcion:
        "Tu solicitud fue registrada correctamente. En producción, aquí se mostrará el informe completo, los escritos y los datos asociados al análisis del certificado.",
      downloadUrl: `/api/download/${requestId}`,
    },
  });
}