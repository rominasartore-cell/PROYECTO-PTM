"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "ptm-admin-token";

type JsonRecord = Record<string, unknown>;

type ApiResponse = {
  ok?: boolean;
  data?: JsonRecord;
  request?: JsonRecord;
  payment?: JsonRecord;
  analysis?: JsonRecord;
  result?: JsonRecord;
  error?: string;
  message?: string;
};

type ActionState = {
  loading: boolean;
  message: string;
  error: string;
};

const INITIAL_ACTION_STATE: ActionState = {
  loading: false,
  message: "",
  error: "",
};

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function buildAdminHeaders(json = false): HeadersInit {
  const token = getAdminToken();
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";

  return headers;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(`Respuesta no JSON desde ${response.url}`);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error inesperado";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function pickString(record: JsonRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return String(value);
  }

  return fallback;
}

function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === "") continue;

    const normalized = typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function pickBoolean(record: JsonRecord, keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
  }

  return false;
}

function money(value: number): string {
  return value.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function dateText(value?: string | null): string {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusLabel(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved" || status === "paid") return "Pago aprobado";
  if (status === "pending" || status === "created" || status === "processing" || status === "in_process") return "Pendiente";
  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") return "Rechazado";
  if (status === "completed") return "Completado";

  return status || "Sin estado";
}

function statusClass(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved" || status === "paid" || status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, monospace = false }: { label: string; value: ReactNode; monospace?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className={`mt-1 break-words text-sm text-slate-200 ${monospace ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminRequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ requestId?: string | string[] }>();

  const requestId = useMemo(() => {
    const raw = params?.requestId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? decodeURIComponent(value) : "";
  }, [params]);

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [actionState, setActionState] = useState<ActionState>(INITIAL_ACTION_STATE);

  const request = useMemo(() => {
    const root = asRecord(payload?.data || payload?.request || payload || {});
    const nestedPayment = asRecord(payload?.payment);
    const nestedAnalysis = asRecord(payload?.analysis || payload?.result);

    return {
      root,
      payment: nestedPayment,
      analysis: nestedAnalysis,
      merged: {
        ...nestedAnalysis,
        ...nestedPayment,
        ...root,
      } as JsonRecord,
    };
  }, [payload]);

  const merged = request.merged;
  const status = pickString(merged, ["payment_status", "paymentStatus", "purchase_status", "purchaseStatus", "status"], "pending");
  const customerName = pickString(merged, ["customer_name", "customerName", "name", "payer_name", "payerName"], "Cliente sin nombre");
  const customerEmail = pickString(merged, ["customer_email", "customerEmail", "payment_customer_email", "paymentCustomerEmail", "email", "payer_email", "payerEmail"], "Sin correo");
  const plate = pickString(merged, ["vehicle_plate", "vehiclePlate", "plate", "patente"], "Sin patente");
  const amount = pickNumber(merged, ["payment_amount", "paymentAmount", "amount", "transaction_amount"], 0);
  const preferenceId = pickString(merged, ["preference_id", "preferenceId"], "");
  const paymentId = pickString(merged, ["payment_id", "paymentId", "mercado_pago_payment_id", "mercadoPagoPaymentId"], "");
  const createdAt = pickString(merged, ["created_at", "createdAt"], "");
  const updatedAt = pickString(merged, ["updated_at", "updatedAt"], "");
  const paidAt = pickString(merged, ["payment_paid_at", "paymentPaidAt", "paid_at", "paidAt"], "");
  const source = pickString(merged, ["source"], "");
  const isMock = pickBoolean(merged, ["payment_mock", "paymentMock", "mock"]);
  const isSandbox = pickBoolean(merged, ["payment_sandbox", "paymentSandbox", "sandbox"]);
  const isSupabase = pickBoolean(merged, ["payment_supabase_record", "paymentSupabaseRecord", "supabase_record", "supabaseRecord"]);
  const isLocalOnly = pickBoolean(merged, ["local_only", "localOnly"]);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      setError("");
      setActionState(INITIAL_ACTION_STATE);

      const stamp = Date.now();
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}?ts=${stamp}`, {
        cache: "no-store",
        headers: buildAdminHeaders(),
      });
      const json = await readJson<ApiResponse>(response);

      if (!response.ok || json.ok === false) {
        throw new Error(json.error || json.message || "No se pudo cargar el detalle de la solicitud");
      }

      setPayload(json);
    } catch (err: unknown) {
      setPayload(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    const token = getAdminToken();

    if (!token) {
      router.replace("/admin");
      return;
    }

    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady || !requestId) return;
    void loadRequest();
  }, [authReady, requestId, loadRequest]);

  async function postAction(url: string, successFallback: string) {
    try {
      setActionState({ loading: true, message: "", error: "" });

      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: buildAdminHeaders(true),
      });
      const json = await readJson<ApiResponse>(response);

      if (!response.ok || json.ok === false) {
        throw new Error(json.error || json.message || "No se pudo completar la acción");
      }

      setActionState({ loading: false, message: json.message || successFallback, error: "" });
      await loadRequest();
    } catch (err: unknown) {
      setActionState({ loading: false, message: "", error: getErrorMessage(err) });
    }
  }

  function openDocument(type: "informe" | "solicitud" | "instructivo") {
    const url = `/api/admin/requests/${encodeURIComponent(requestId)}/download?type=${encodeURIComponent(type)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openClientResult() {
    window.open(`/resultados/${encodeURIComponent(requestId)}`, "_blank", "noopener,noreferrer");
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-xl">
          Verificando sesión administrativa...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Prescribe tu Multa</p>
              <h1 className="mt-2 text-3xl font-black">Detalle administrativo</h1>
              <p className="mt-2 break-all text-sm text-slate-300">Request ID: {requestId || "Sin requestId"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => void loadRequest()}
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
        {actionState.error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{actionState.error}</div>}
        {actionState.message && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">{actionState.message}</div>}

        {loading ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Cargando detalle...</section>
        ) : !payload ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            No hay datos para mostrar.
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Estado</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={statusClass(status)}>{statusLabel(status)}</Badge>
                  {source === "payment_only" && <Badge className="border-purple-500/40 bg-purple-500/10 text-purple-200">Pago sin análisis</Badge>}
                  {isMock && <Badge className="border-blue-500/40 bg-blue-500/10 text-blue-200">Mock</Badge>}
                  {isSandbox && <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-200">Sandbox</Badge>}
                  {isSupabase && <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">Supabase</Badge>}
                  {isLocalOnly && <Badge className="border-slate-500/40 bg-slate-500/10 text-slate-200">Solo local</Badge>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Monto pagado/creado</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{money(amount)}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Cliente</p>
                <p className="mt-2 truncate text-xl font-black">{customerName}</p>
                <p className="mt-1 break-all text-sm text-slate-400">{customerEmail}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Patente</p>
                <p className="mt-2 text-3xl font-black">{plate}</p>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoCard title="Datos principales">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Nombre" value={customerName} />
                  <Field label="Correo" value={customerEmail} />
                  <Field label="Patente" value={plate} />
                  <Field label="Estado de pago" value={statusLabel(status)} />
                  <Field label="Request ID" value={requestId} monospace />
                  <Field label="Preference ID" value={preferenceId || "Sin preference_id"} monospace />
                  <Field label="Payment ID" value={paymentId || "Sin payment_id"} monospace />
                  <Field label="Monto" value={money(amount)} />
                  <Field label="Creado" value={dateText(createdAt)} />
                  <Field label="Actualizado" value={dateText(updatedAt)} />
                  <Field label="Pagado" value={paidAt ? dateText(paidAt) : "No aprobado"} />
                  <Field label="Fuente" value={source || "Sin fuente"} />
                </div>
              </InfoCard>

              <InfoCard title="Acciones">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void postAction(`/api/admin/requests/${encodeURIComponent(requestId)}/resend-email`, "Correo reenviado correctamente")}
                    disabled={actionState.loading}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionState.loading ? "Procesando..." : "Reenviar correo"}
                  </button>

                  <button
                    type="button"
                    onClick={openClientResult}
                    className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
                  >
                    Abrir resultado cliente
                  </button>

                  <button
                    type="button"
                    onClick={() => openDocument("informe")}
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                  >
                    Previsualizar informe
                  </button>

                  <button
                    type="button"
                    onClick={() => openDocument("solicitud")}
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                  >
                    Previsualizar solicitud
                  </button>

                  <button
                    type="button"
                    onClick={() => openDocument("instructivo")}
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800 sm:col-span-2"
                  >
                    Previsualizar instructivo
                  </button>
                </div>

                <p className="text-sm text-slate-400">
                  El reenvío usa el endpoint administrativo de confirmación. Si el pago está aprobado, no debe enviar link directo de descarga.
                </p>
              </InfoCard>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoCard title="Detalle normalizado">
                <JsonBlock value={merged} />
              </InfoCard>

              <InfoCard title="Respuesta completa API">
                <JsonBlock value={payload} />
              </InfoCard>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
