import { NextRequest, NextResponse } from "next/server";
import { fetchUnifiedRequests } from "@/lib/admin/payment-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = numberParam(searchParams.get("page"), 1);
    const limit = Math.min(numberParam(searchParams.get("limit"), 20), 200);

    const result = await fetchUnifiedRequests({
      page,
      limit,
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      paymentStatus: searchParams.get("payment_status") || "",
      statusFilter: searchParams.get("payment_status") || "",
    });

    return NextResponse.json({
      ok: true,
      data: result.data,
      requests: result.requests,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error: any) {
    console.error("[api/admin/requests] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error fetching requests",
      },
      { status: 500 }
    );
  }
}
