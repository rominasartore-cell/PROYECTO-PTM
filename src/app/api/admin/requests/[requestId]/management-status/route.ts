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

type ManagementStatus =
  | "pending_review"
  | "in_progress"
  | "documents_sent"
  | "closed";

const VALID_STATUSES: ManagementStatus[] = [
  "pending_review",
  "in_progress",
  "documents_sent",
  "closed",
];

const DEFAULT_STATUS: ManagementStatus = "pending_review";

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

function isManagementStatus(value: string): value is ManagementStatus {
  return VALID_STATUSES.includes(value as ManagementStatus);
}

function statusLabel(status: ManagementStatus): string {
  if (status === "pending_review") return "Pendiente de revisión";
  if (status === "in_progress") return "En preparación";
  if (status === "documents_sent") return "Documentos enviados";
  if (status === "closed") return "Cerrado";
  return "Pendiente de revisión";
}

async function getCurrentStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<AnyRecord | null> {
  const { data, error } = await supabase
    .from("ptm_request_management_status")
    .select("*")
    .eq("request_id", requestId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AnyRecord;
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
    const current = await getCurrentStatus(supabase, requestId);

    if (!current) {
      return jsonResponse({
        ok: true,
        requestId,
        found: false,
        status: DEFAULT_STATUS,
        label: statusLabel(DEFAULT_STATUS),
        note: "",
        updatedAt: null,
        current: null,
      });
    }

    const status = getString(current.status);

    return jsonResponse({
      ok: true,
      requestId,
      found: true,
      status: isManagementStatus(status) ? status : DEFAULT_STATUS,
      label: isManagementStatus(status) ? statusLabel(status) : statusLabel(DEFAULT_STATUS),
      note: getString(current.note),
      updatedAt: current.updated_at || null,
      current,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error consultando estado interno.",
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
      status?: unknown;
      note?: unknown;
    };

    const nextStatusRaw = getString(body.status);

    if (!isManagementStatus(nextStatusRaw)) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "Estado interno inválido.",
          allowedStatuses: VALID_STATUSES,
        },
        400
      );
    }

    const note = getString(body.note);
    const now = new Date().toISOString();

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("ptm_request_management_status")
      .upsert(
        {
          request_id: requestId,
          status: nextStatusRaw,
          note: note || null,
          updated_by: "admin",
          metadata: {
            source: "admin_request_page",
          },
          updated_at: now,
        },
        {
          onConflict: "request_id",
        }
      )
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

    return jsonResponse({
      ok: true,
      requestId,
      status: nextStatusRaw,
      label: statusLabel(nextStatusRaw),
      note,
      updatedAt: now,
      current: data || null,
      message: "Estado interno actualizado correctamente.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error actualizando estado interno.",
      },
      500
    );
  }
}