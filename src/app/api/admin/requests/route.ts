import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  enrichRequestWithLocalPayment,
  getLocalPaymentOnlyRows,
  getRequestId,
} from "@/lib/admin/payment-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("payment_status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("analysis_requests")
      .select("*", { count: "exact" });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (paymentStatus && paymentStatus !== "all") {
      query = query.eq("payment_status", paymentStatus);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,vehicle_plate.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/admin/requests] Error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const supabaseRows = data || [];

    const enrichedData = await Promise.all(
      supabaseRows.map((row) => enrichRequestWithLocalPayment(row))
    );

    const existingRequestIds = enrichedData.map((row) => getRequestId(row)).filter(Boolean);

    const localOnlyRows =
      page === 1
        ? await getLocalPaymentOnlyRows(existingRequestIds, {
            status,
            paymentStatus,
            search,
          })
        : [];

    const mergedData = [...localOnlyRows, ...enrichedData].slice(0, limit);
    const total = (count || 0) + localOnlyRows.length;

    return NextResponse.json({
      ok: true,
      data: mergedData,
      requests: mergedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      localOnlyPayments: localOnlyRows.length,
    });
  } catch (error: any) {
    console.error("[api/admin/requests] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error fetching requests" },
      { status: 500 }
    );
  }
}
