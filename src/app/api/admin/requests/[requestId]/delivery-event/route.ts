import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

type AnyRecord = Record<string, unknown>;

const VALID_MEDIUMS = ["gmail", "outlook", "whatsapp", "other"] as const;

function jsonResponse(body: AnyRecord, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getString(value: unknown): string {
  return String(value ?? "").trim();
}

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan variables Supabase de servidor.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeMedium(value: unknown): string {
  const medium = getString(value).toLowerCase();

  if ((VALID_MEDIUMS as readonly string[]).includes(medium)) {
    return medium;
  }

  return "gmail";
}

function mediumLabel(value: string): string {
  if (value === "gmail") return "Gmail";
  if (value === "outlook") return "Outlook";
  if (value === "whatsapp") return "WhatsApp";
  return "Otro";
}

async function listDeliveryEvents(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord[]> {
  const { data, error } = await supabase
    .from("ptm_delivery_events")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data as AnyRecord[];
}

async function updateManagementStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string,
  medium: string
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from("ptm_request_management_status")
      .select("status")
      .eq("request_id", requestId)
      .limit(1)
      .maybeSingle();

    const currentStatus = getString((current as AnyRecord | null)?.status);

    if (currentStatus === "closed") {
      return;
    }

    const now = new Date().toISOString();

    await supabase.from("ptm_request_management_status").upsert(
      {
        request_id: requestId,
        status: "documents_sent",
        note: `Entrega manual registrada por ${mediumLabel(medium)}.`,
        updated_by: "admin",
        metadata: {
          source: "manual_delivery_event",
          medium,
        },
        updated_at: now,
      },
      {
        onConflict: "request_id",
      }
    );
  } catch (error) {
    console.warn("[PTM_DELIVERY_MANAGEMENT_STATUS_WARNING]", error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse(
        {
          ok: false,
          error: "requestId requerido.",
        },
        400
      );
    }

    const supabase = getSupabaseClient();
    const events = await listDeliveryEvents(supabase, requestId);

    return jsonResponse({
      ok: true,
      requestId,
      events,
      lastEvent: events[0] || null,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error consultando entregas manuales.",
      },
      500
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const requestId = decodeURIComponent(getString(params.requestId));

    if (!requestId) {
      return jsonResponse(
        {
          ok: false,
          error: "requestId requerido.",
        },
        400
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      medium?: unknown;
      note?: unknown;
    };

    const medium = normalizeMedium(body.medium);
    const note = getString(body.note);

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("ptm_delivery_events")
      .insert({
        request_id: requestId,
        medium,
        note: note || null,
        status: "delivered",
        metadata: {
          source: "admin_request_page",
        },
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: error.message,
        },
        500
      );
    }

    await updateManagementStatus(supabase, requestId, medium);

    const events = await listDeliveryEvents(supabase, requestId);

    return jsonResponse({
      ok: true,
      requestId,
      medium,
      mediumLabel: mediumLabel(medium),
      event: data || null,
      lastEvent: events[0] || data || null,
      events,
      message: "Entrega manual registrada correctamente.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error registrando entrega manual.",
      },
      500
    );
  }
}