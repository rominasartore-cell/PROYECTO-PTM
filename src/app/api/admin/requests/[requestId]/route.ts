import { NextRequest, NextResponse } from "next/server";
import { findLocalPaymentAsRequest } from "@/lib/admin/payment-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

async function getNotes(requestId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_notes")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Missing requestId" },
        { status: 400 }
      );
    }

    const unifiedRequest = await findLocalPaymentAsRequest(requestId);

    if (!unifiedRequest) {
      return NextResponse.json(
        { ok: false, error: "Solicitud o pago no encontrado" },
        { status: 404 }
      );
    }

    const notes = await getNotes(requestId);

    return NextResponse.json({
      ok: true,
      request: unifiedRequest,
      data: unifiedRequest,
      notes,
    });
  } catch (error: any) {
    console.error("[api/admin/requests/[requestId]] Error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error fetching request",
      },
      { status: 500 }
    );
  }
}
