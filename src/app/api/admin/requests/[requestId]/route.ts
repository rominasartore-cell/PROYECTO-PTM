import { NextRequest, NextResponse } from "next/server";
import { fetchUnifiedRequests } from "@/lib/admin/payment-admin";

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

function text(value: unknown): string {
  return String(value || "").trim();
}

function sameRequestId(row: any, requestId: string): boolean {
  const normalized = requestId.trim();

  const candidates = [
    row?.request_id,
    row?.requestId,
    row?.id,
    row?.external_reference,
    row?.externalReference,
    row?.payment?.requestId,
    row?.payment?.externalReference,
  ];

  return candidates.some((value) => text(value) === normalized);
}

export async function GET(_request: NextRequest, context: RouteContext) {
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

    const result = await fetchUnifiedRequests({
      page: 1,
      limit: 200,
      search: requestId,
      status: "",
      paymentStatus: "",
      statusFilter: "",
    });

    const rows = result.requests || result.data || [];
    const found =
      rows.find((row: any) => sameRequestId(row, requestId)) ||
      rows.find((row: any) => text(row?.request_id || row?.requestId || row?.id).includes(requestId)) ||
      null;

    if (!found) {
      return NextResponse.json(
        {
          ok: false,
          found: false,
          requestId,
          error: "No se encontró la solicitud.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      found: true,
      requestId,
      data: found,
      request: found,
      payment: found.payment || null,
      analysis: found.raw_analysis_json || null,
      result: found.raw_analysis_json || null,
    });
  } catch (error: any) {
    console.error("[api/admin/requests/[requestId]] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error fetching request detail",
      },
      { status: 500 }
    );
  }
}