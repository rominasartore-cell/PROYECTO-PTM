import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildAdminMetrics } from "@/lib/admin/payment-admin";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("analysis_requests")
      .select("request_id, status, payment_status");

    if (error) {
      console.error("[api/admin/metrics] Error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const metrics = await buildAdminMetrics(data || []);

    return NextResponse.json({
      ok: true,
      metrics,
    });
  } catch (error: any) {
    console.error("[api/admin/metrics] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error fetching metrics" },
      { status: 500 }
    );
  }
}
