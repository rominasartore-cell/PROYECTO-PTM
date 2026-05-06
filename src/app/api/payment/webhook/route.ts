export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    return Response.json({
      ok: true,
      received: true,
      mock: process.env.MOCK_PAYMENT === "true",
      body,
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "Error procesando webhook." },
      { status: 500 }
    );
  }
}
