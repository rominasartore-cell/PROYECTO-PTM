import { NextResponse } from "next/server";
import { fetchAdminMetrics } from "@/lib/admin/payment-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await fetchAdminMetrics();

    return NextResponse.json({
      ok: true,
      metrics,
    });
  } catch (error: any) {
    console.error("[api/admin/metrics] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error fetching metrics",
      },
      { status: 500 }
    );
  }
}
