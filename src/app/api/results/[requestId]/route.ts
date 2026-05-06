export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: any) {
  const requestId = context?.params?.requestId;

  return Response.json(
    {
      ok: false,
      message: "Resultado pendiente de implementacion.",
      requestId,
    },
    { status: 501 }
  );
}
