"use client";

import type { ReactNode } from "react";
import ManualDeliveryCard from "@/components/admin/ManualDeliveryCard";
import RequestManagementStatusCard from "@/components/admin/RequestManagementStatusCard";
import SendDocumentsReadyButton from "@/components/admin/SendDocumentsReadyButton";
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

const INITIAL_ACTION_STATE: ActionState = { loading: false, message: "", error: "" };

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

function getNestedPayment(root: JsonRecord): JsonRecord {
  return asRecord(root.payment);
}

function getNestedRawAnalysis(root: JsonRecord): JsonRecord {
  return asRecord(root.raw_analysis_json || root.analysis || root.result);
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
  return date.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(value?: string | null): string {
  const status = String(value || "").toLowerCase();
  if (status === "approved" || status === "paid" || status === "completed") return "Pago aprobado";
  if (status === "pending" || status === "created" || status === "processing" || status === "in_process") return "Pendiente";
  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") return "Rechazado";
  return status || "Sin estado";
}

function statusClass(value?: string | null): string {
  const status = String(value || "").toLowerCase();
  if (status === "approved" || status === "paid" || status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") return "border-red-200 bg-red-50 text-red-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function isApprovedStatus(value?: string | null): boolean {
  const status = String(value || "").toLowerCase();
  return status === "approved" || status === "paid" || status === "completed";
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${className}`}>{children}</span>;
}

function Field({ label, value, monospace = false }: { label: string; value: ReactNode; monospace?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className={`mt-1 break-words text-sm font-semibold text-slate-800 ${monospace ? "font-mono" : ""}`}>{value || "-"}</div>
    </div>
  );
}

function SummaryCard({ label, value, hint, tone = "white" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "white" | "green" | "blue" | "amber" | "red"; }) {
  const toneClasses = {
    white: "border-slate-200 bg-white text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-cyan-200 bg-cyan-50 text-cyan-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">{label}</p>
      <div className="mt-1.5 text-xl font-black">{value}</div>
      {hint ? <p className="mt-1 text-xs font-semibold opacity-70">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children, defaultOpen = false, hint }: { title: string; children: ReactNode; defaultOpen?: boolean; hint?: string; }) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <span className="text-xs font-bold text-slate-500">Abrir/cerrar</span>
        </div>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(value, null, 2)}</pre>;
}

function firstValue(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function textValue(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function optionalMoney(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  const normalized = typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return "-";
  return money(amount);
}

function optionalNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return String(amount);
}

function getFineLogsFromRecord(record: JsonRecord): JsonRecord[] {
  const candidates = [
    record.logs,
    asRecord(record.result).logs,
    asRecord(record.analysis).logs,
    asRecord(record.analysisResult).logs,
    asRecord(record.preliminaryResult).logs,
    asRecord(record.data).logs,
    asRecord(asRecord(record.raw_analysis_json).data).logs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as JsonRecord[];
  }

  return [];
}

function fineStatusClass(value: unknown): string {
  const status = String(value || "").toUpperCase();
  if (status.includes("PRESCRITA")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status.includes("VIGENTE")) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-800";
}

function fineStatusLabel(value: unknown): string {
  const status = String(value || "").toUpperCase();
  if (status === "POTENCIALMENTE_PRESCRITA") return "Potencialmente prescrita";
  if (status === "VIGENTE") return "Vigente";
  return status || "Sin estado";
}

function FinesTable({ fines }: { fines: JsonRecord[] }) {
  if (!fines.length) return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">No hay multas detectadas para mostrar.</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">ID multa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ingreso RMNP</th>
              <th className="px-4 py-3">Prescripción ref.</th>
              <th className="px-4 py-3 text-right">UTM</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {fines.map((fine, index) => {
              const estado = firstValue(fine, ["estado", "status"]);
              const idMulta = firstValue(fine, ["idMulta", "id_multa", "fineId"]);
              const ingresoRmnp = firstValue(fine, ["fechaIngresoRmnp", "fecha_ingreso_rmnp"]);
              const prescripcion = firstValue(fine, ["fechaPrescripcionReferencial", "fecha_prescripcion_referencial"]);
              const montoUtm = firstValue(fine, ["montoUtm", "monto_utm"]);
              const montoPesos = firstValue(fine, ["montoPesos", "monto_pesos"]);

              return (
                <tr key={`${textValue(idMulta, "multa")}-${index}`} className="align-top transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{textValue(idMulta)}</td>
                  <td className="px-4 py-3"><Badge className={fineStatusClass(estado)}>{fineStatusLabel(estado)}</Badge></td>
                  <td className="px-4 py-3 text-slate-700">{textValue(ingresoRmnp)}</td>
                  <td className="px-4 py-3 text-slate-700">{textValue(prescripcion)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{optionalNumber(montoUtm)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{optionalMoney(montoPesos)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, tone = "default" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "primary" | "success" | "danger"; }) {
  const classes = {
    default: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    primary: "bg-cyan-700 text-white hover:bg-cyan-800",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[tone]}`}>
      {children}
    </button>
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

  const normalized = useMemo(() => {
    const root = asRecord(payload?.data || payload?.request || payload || {});
    const directPayment = asRecord(payload?.payment);
    const nestedPayment = getNestedPayment(root);
    const payment = Object.keys(directPayment).length ? directPayment : nestedPayment;

    const directAnalysis = asRecord(payload?.analysis || payload?.result);
    const nestedAnalysis = getNestedRawAnalysis(root);
    const analysis = Object.keys(directAnalysis).length ? directAnalysis : nestedAnalysis;

    return { root, payment, analysis, merged: { ...analysis, ...payment, ...root } as JsonRecord };
  }, [payload]);

  const merged = normalized.merged;
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
  const pdfPath = pickString(merged, ["pdf_path", "pdfPath"], "");
  const pdfFilename = pickString(merged, ["pdf_filename", "pdfFilename"], "");

  const totalFines = pickNumber(merged, ["fine_count", "finesCount", "totalFines", "totalMultas", "multasTotalesDetectadas"], 0);
  const prescribedCount = pickNumber(merged, ["prescribed_count", "prescribedCount", "multasPotencialmentePrescritas", "multasPrescritasConMonto"], 0);
  const potentialAmount = pickNumber(merged, ["montoPotencialPesos", "potentialAmount", "totalPotentialAmount", "montoTotalPrescrito"], 0);
  const totalUtm = pickNumber(merged, ["total_amount_utm", "totalUtm", "totalUtmPrescritas", "sumaTotalUtmPrescritas"], 0);

  const isMock = pickBoolean(merged, ["payment_mock", "paymentMock", "mock"]);
  const isSandbox = pickBoolean(merged, ["payment_sandbox", "paymentSandbox", "sandbox"]);
  const isSupabase = pickBoolean(merged, ["payment_supabase_record", "paymentSupabaseRecord", "has_supabase_payment", "supabase_record", "supabaseRecord"]);
  const isLocalOnly = pickBoolean(merged, ["local_only", "localOnly"]);
  const approved = isApprovedStatus(status);
  const fineLogs = useMemo(() => getFineLogsFromRecord(merged), [merged]);
  const paymentOnly = source === "payment_only";

  const loadRequest = useCallback(async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      setError("");
      setActionState(INITIAL_ACTION_STATE);

      const query = new URLSearchParams({ search: requestId, limit: "100", ts: String(Date.now()) });

      const response = await fetch(`/api/admin/requests?${query.toString()}`, {
        cache: "no-store",
        headers: buildAdminHeaders(),
      });

      const json = await readJson<any>(response);

      if (!response.ok || json.ok === false) throw new Error(json.error || json.message || "No se pudo cargar el detalle de la solicitud");

      const rows = Array.isArray(json.requests) ? json.requests : Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      const found = rows.find((row: any) => {
        const payment = asRecord(row?.payment);
        const candidates = [row?.request_id, row?.requestId, row?.id, row?.external_reference, row?.externalReference, payment.requestId, payment.externalReference];
        return candidates.some((value) => String(value || "").trim() === requestId);
      }) || rows[0] || null;

      if (!found) throw new Error("No se encontró la solicitud en el listado administrativo.");

      const analysis = asRecord(found.raw_analysis_json || found.analysisResult || found.preliminaryResult || found.analysis || found.result);

      setPayload({ ok: true, data: found, request: found, payment: asRecord(found.payment), analysis, result: analysis });
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

      const response = await fetch(url, { method: "POST", cache: "no-store", headers: buildAdminHeaders(true) });
      const json = await readJson<ApiResponse>(response);

      if (!response.ok || json.ok === false) throw new Error(json.error || json.message || "No se pudo completar la acción");

      setActionState({ loading: false, message: json.message || successFallback, error: "" });
      await loadRequest();
    } catch (err: unknown) {
      setActionState({ loading: false, message: "", error: getErrorMessage(err) });
    }
  }

  async function copyText(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setActionState({ loading: false, message: `${label} copiado.`, error: "" });
    } catch {
      setActionState({ loading: false, message: "", error: `No se pudo copiar ${label}.` });
    }
  }

  function openClientResult() {
    window.open(`/resultados/${encodeURIComponent(requestId)}`, "_blank", "noopener,noreferrer");
  }

  function openPreview(kind: "report" | "drafts") {
    const path = kind === "report" ? `/api/admin/requests/${encodeURIComponent(requestId)}/preview-report` : `/api/admin/requests/${encodeURIComponent(requestId)}/preview-drafts`;
    window.open(path, "_blank", "noopener,noreferrer");
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-600 shadow-xl">Verificando sesión administrativa...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Prescribe tu Multa</p>
              <h1 className="mt-1 text-2xl font-black">Ficha de solicitud</h1>
              <p className="mt-1 break-all text-xs font-semibold text-slate-500">Request ID: {requestId || "Sin requestId"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => router.push("/admin/dashboard")}>Dashboard</ActionButton>
              <ActionButton onClick={() => void loadRequest()} disabled={loading} tone="primary">{loading ? "Actualizando..." : "Actualizar"}</ActionButton>
            </div>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        {actionState.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{actionState.error}</div> : null}
        {actionState.message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{actionState.message}</div> : null}

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Cargando detalle...</section>
        ) : !payload ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">No hay datos para mostrar.</section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Estado" value={<Badge className={statusClass(status)}>{statusLabel(status)}</Badge>} hint={paymentOnly ? "Pago sin análisis" : approved ? "Listo para operar" : "Revisar estado"} tone={paymentOnly ? "red" : approved ? "green" : "amber"} />
              <SummaryCard label="Monto" value={money(amount)} hint={paidAt ? `Pagado: ${dateText(paidAt)}` : "Sin pago aprobado"} tone="green" />
              <SummaryCard label="Cliente" value={<span className="text-xl">{customerName}</span>} hint={customerEmail} />
              <SummaryCard label="Patente" value={plate} hint="Vehículo" />
              <SummaryCard label="Prescritas" value={prescribedCount || "No informado"} hint={potentialAmount ? money(potentialAmount) : "Monto no informado"} tone="blue" />
            </section>

            {paymentOnly ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                <p className="text-sm font-black">Pago aprobado sin análisis asociado.</p>
                <p className="mt-1 text-xs font-semibold">No generar documentos desde esta ficha hasta revisar el origen del pago.</p>
              </div>
            ) : null}

            <Section title="1. Operación documental" defaultOpen hint="Bloque principal para editar/generar documentos.">
              <RequestManagementStatusCard />

              <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-black text-slate-800">Correo y cierre</summary>
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  <SendDocumentsReadyButton />
                  <ManualDeliveryCard />
                </div>
              </details>
            </Section>

            <Section title="2. Datos del caso" hint="Resumen útil para verificar antes de enviar documentos.">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-900">Pago</h3>
                  <div className="mt-3 grid gap-3">
                    <Field label="Estado" value={statusLabel(status)} />
                    <Field label="Monto" value={money(amount)} />
                    <Field label="Preference ID" value={preferenceId || "Sin preference_id"} monospace />
                    <Field label="Payment ID" value={paymentId || "Sin payment_id"} monospace />
                    <Field label="Creado" value={dateText(createdAt)} />
                    <Field label="Actualizado" value={dateText(updatedAt)} />
                    <Field label="Pagado" value={paidAt ? dateText(paidAt) : "No aprobado"} />
                    <Field label="Tags" value={[isMock ? "Mock" : "", isSandbox ? "Sandbox" : "", isSupabase ? "Supabase" : "", isLocalOnly ? "Solo local" : ""].filter(Boolean).join(" · ") || "Sin tags"} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-900">Análisis</h3>
                  <div className="mt-3 grid gap-3">
                    <Field label="Total multas" value={totalFines || "No informado"} />
                    <Field label="Potencialmente prescritas" value={prescribedCount || "No informado"} />
                    <Field label="Monto potencial" value={potentialAmount ? money(potentialAmount) : "No informado"} />
                    <Field label="UTM prescritas" value={totalUtm || "No informado"} />
                    <Field label="PDF" value={pdfFilename || pdfPath || "No informado"} />
                    <Field label="Fuente" value={source || "Análisis"} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-900">Acciones rápidas</h3>
                  <div className="mt-3 grid gap-3">
                    <ActionButton onClick={() => void postAction(`/api/admin/requests/${encodeURIComponent(requestId)}/resend-email`, "Correo reenviado correctamente")} disabled={actionState.loading || !approved} tone="success">
                      {actionState.loading ? "Procesando..." : "Reenviar correo"}
                    </ActionButton>
                    <ActionButton onClick={openClientResult} tone="primary">Abrir resultado cliente</ActionButton>
                    <ActionButton onClick={() => void copyText(requestId, "Request ID")}>Copiar Request ID</ActionButton>
                    <ActionButton onClick={() => openPreview("report")}>Previsualizar informe</ActionButton>
                    <ActionButton onClick={() => openPreview("drafts")}>Previsualizar escritos</ActionButton>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="3. Multas detectadas" hint="Abrir solo si necesitas revisar detalle de multas.">
              <FinesTable fines={fineLogs} />
            </Section>

            <Section title="4. Datos técnicos" hint="Solo diagnóstico. No es necesario en operación normal.">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-black text-slate-900">Detalle normalizado</h3>
                  <JsonBlock value={merged} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-black text-slate-900">Respuesta completa API</h3>
                  <JsonBlock value={payload} />
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
