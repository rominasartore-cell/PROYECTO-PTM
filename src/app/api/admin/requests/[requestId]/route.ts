import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  enrichRequestWithLocalPayment,
  findLocalPaymentAsRequest,
} from "@/lib/admin/payment-admin";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Missing requestId" },
        { status: 400 }
      );
    }

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("analysis_requests")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (requestError) {
      console.error("[api/admin/requests/[requestId]] Request error:", requestError);
      return NextResponse.json(
        { ok: false, error: requestError.message },
        { status: 500 }
      );
    }

    let notes: any[] = [];

    const { data: notesData, error: notesError } = await supabaseAdmin
      .from("admin_notes")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("[api/admin/requests/[requestId]] Notes error:", notesError);
    } else {
      notes = notesData || [];
    }

    if (!requestData) {
      const localOnlyRequest = await findLocalPaymentAsRequest(requestId);

      if (!localOnlyRequest) {
        return NextResponse.json(
          { ok: false, error: "Request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        request: localOnlyRequest,
        data: localOnlyRequest,
        notes,
      });
    }

    const enrichedRequest = await enrichRequestWithLocalPayment(requestData, requestId);

    return NextResponse.json({
      ok: true,
      request: enrichedRequest,
      data: enrichedRequest,
      notes,
    });
  } catch (error: any) {
    console.error("[api/admin/requests/[requestId]] Error:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Error fetching request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const body = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Missing requestId" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.status === "string") {
      updateData.status = body.status;
    }

    if (typeof body.payment_status === "string") {
      updateData.payment_status = body.payment_status;
    }

    if (typeof body.internal_notes === "string") {
      updateData.internal_notes = body.internal_notes;
    }

    const { data: updatedRequest, error } = await supabaseAdmin
      .from("analysis_requests")
      .update(updateData)
      .eq("request_id", requestId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[api/admin/requests/[requestId] PATCH] Error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!updatedRequest) {
      const localOnlyRequest = await findLocalPaymentAsRequest(requestId);

      if (!localOnlyRequest) {
        return NextResponse.json(
          { ok: false, error: "Request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        request: localOnlyRequest,
        data: localOnlyRequest,
        warning: "Solicitud solo existe en storage local; no se actualizo Supabase.",
      });
    }

    const enrichedRequest = await enrichRequestWithLocalPayment(updatedRequest, requestId);

    return NextResponse.json({
      ok: true,
      request: enrichedRequest,
      data: enrichedRequest,
    });
  } catch (error: any) {
    console.error("[api/admin/requests/[requestId] PATCH] Error:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Error updating request" },
      { status: 500 }
    );
  }
}
