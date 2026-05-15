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

  return date.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
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

  if (status === "approved" || status === "paid" || status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
}

function isApprovedStatus(value?: string | null): boolean {
  const status = String(value || "").toLowerCase();
  return status === "approved" || status === "paid" || status === "completed";
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${className}`}>{children}</span>;
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
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className={`mt-1 break-words text-sm text-slate-200 ${monospace ? "font-mono" : ""}`}>{value || "-"}</div>
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
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as JsonRecord[];
    }
  }

  return [];
}

function fineStatusClass(value: unknown): string {
  const status = String(value || "").toUpperCase();

  if (status.includes("PRESCRITA")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status.includes("VIGENTE")) {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
  }

  return "border-slate-500/40 bg-slate-500/10 text-slate-200";
}

function fineStatusLabel(value: unknown): string {
  const status = String(value || "").toUpperCase();

  if (status === "POTENCIALMENTE_PRESCRITA") return "Potencialmente prescrita";
  if (status === "VIGENTE") return "Vigente";

  return status || "Sin estado";
}

function FinesTable({ fines }: { fines: JsonRecord[] }) {
  if (!fines.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
        No hay multas detectadas para mostrar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">ID multa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ingreso RMNP</th>
              <th className="px-4 py-3">Prescripcion ref.</th>
              <th className="px-4 py-3 text-right">UTM</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {fines.map((fine, index) => {
              const estado = firstValue(fine, ["estado", "status"]);
              const idMulta = firstValue(fine, ["idMulta", "id_multa", "fineId"]);
              const ingresoRmnp = firstValue(fine, ["fechaIngresoRmnp", "fecha_ingreso_rmnp"]);
              const prescripcion = firstValue(fine, ["fechaPrescripcionReferencial", "fecha_prescripcion_referencial"]);
              const montoUtm = firstValue(fine, ["montoUtm", "monto_utm"]);
              const montoPesos = firstValue(fine, ["montoPesos", "monto_pesos"]);

              return (
                <tr key={`${textValue(idMulta, "multa")}-${index}`} className="align-top transition hover:bg-slate-800/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">
                    {textValue(idMulta)}
                  </td>

                  <td className="px-4 py-3">
                    <Badge className={fineStatusClass(estado)}>{fineStatusLabel(estado)}</Badge>
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {textValue(ingresoRmnp)}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {textValue(prescripcion)}
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-slate-200">
                    {optionalNumber(montoUtm)}
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-emerald-300">
                    {optionalMoney(montoPesos)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  const classes = {
    default: "border border-slate-700 text-slate-200 hover:bg-slate-800",
    primary: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
    success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    danger: "bg-red-500 text-white hover:bg-red-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[tone]}`}
    >
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

    return {
      root,
      payment,
      analysis,
      merged: {
        ...analysis,
        ...payment,
        ...root,
      } as JsonRecord,
    };
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
  const checkoutUrl = pickString(merged, ["checkoutUrl", "checkout_url"], "");

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

  const loadRequest = useCallback(async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      setError("");
      setActionState(INITIAL_ACTION_STATE);

      const stamp = Date.now();
      const query = new URLSearchParams({
        search: requestId,
        limit: "100",
        ts: String(stamp),
      });

      const response = await fetch(`/api/admin/requests?${query.toString()}`, {
        cache: "no-store",
        headers: buildAdminHeaders(),
      });

      const json = await readJson<any>(response);

      if (!response.ok || json.ok === false) {
        throw new Error(json.error || json.message || "No se pudo cargar el detalle de la solicitud");
      }

      const rows = Array.isArray(json.requests)
        ? json.requests
        : Array.isArray(json.data)
          ? json.data
          : json.data
            ? [json.data]
            : [];

      const found =
        rows.find((row: any) => {
          const payment = asRecord(row?.payment);

          const candidates = [
            row?.request_id,
            row?.requestId,
            row?.id,
            row?.external_reference,
            row?.externalReference,
            payment.requestId,
            payment.externalReference,
          ];

          return candidates.some((value) => String(value || "").trim() === requestId);
        }) ||
        rows[0] ||
        null;

      if (!found) {
        throw new Error("No se encontro la solicitud en el listado administrativo.");
      }

      const analysis = asRecord(
        found.raw_analysis_json ||
          found.analysisResult ||
          found.preliminaryResult ||
          found.analysis ||
          found.result
      );

      setPayload({
        ok: true,
        data: found,
        request: found,
        payment: asRecord(found.payment),
        analysis,
        result: analysis,
      });
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
        throw new Error(json.error || json.message || "No se pudo completar la accion");
      }

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
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      return;
    }

    window.open(`/resultados/${encodeURIComponent(requestId)}`, "_blank", "noopener,noreferrer");
  }

  function openPreview(kind: "report" | "drafts") {
    const path =
      kind === "report"
        ? `/api/admin/requests/${encodeURIComponent(requestId)}/preview-report`
        : `/api/admin/requests/${encodeURIComponent(requestId)}/preview-drafts`;

    window.open(path, "_blank", "noopener,noreferrer");
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-xl">
          Verificando sesion administrativa...
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
              <h1 className="mt-2 text-3xl font-black">Ficha administrativa</h1>
<p className="mt-2 break-all text-sm text-slate-300">Request ID: {requestId || "Sin requestId"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => router.push("/admin/dashboard")}>Volver dashboard</ActionButton>
              <ActionButton onClick={() => void loadRequest()} disabled={loading} tone="primary">
                {loading ? "Actualizando..." : "Actualizar"}
              </ActionButton>
            </div>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
        {actionState.error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{actionState.error}</div> : null}
        {actionState.message ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">{actionState.message}</div> : null}
        <section className="grid gap-4 xl:grid-cols-3">
          <SendDocumentsReadyButton />
          <RequestManagementStatusCard />
          <ManualDeliveryCard />
        </section>

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
                <p className="text-sm text-slate-400">Estado comercial</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={statusClass(status)}>{statusLabel(status)}</Badge>
                  {source === "payment_only" ? <Badge className="border-purple-500/40 bg-purple-500/10 text-purple-200">Pago sin analisis</Badge> : null}
                  {isMock ? <Badge className="border-blue-500/40 bg-blue-500/10 text-blue-200">Mock</Badge> : null}
                  {isSandbox ? <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-200">Sandbox</Badge> : null}
                  {isSupabase ? <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">Supabase</Badge> : null}
                  {isLocalOnly ? <Badge className="border-slate-500/40 bg-slate-500/10 text-slate-200">Solo local</Badge> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Monto pagado</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{money(amount)}</p>
                <p className="mt-1 text-xs text-slate-500">{paidAt ? `Pagado: ${dateText(paidAt)}` : "Sin pago aprobado"}</p>
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

            <section className="grid gap-4 lg:grid-cols-3">
              <InfoCard title="Datos de pago">
                <div className="grid gap-3">
                  <Field label="Estado" value={statusLabel(status)} />
                  <Field label="Monto" value={money(amount)} />
                  <Field label="Request ID" value={requestId} monospace />
                  <Field label="Preference ID" value={preferenceId || "Sin preference_id"} monospace />
                  <Field label="Payment ID" value={paymentId || "Sin payment_id"} monospace />
                  <Field label="Creado" value={dateText(createdAt)} />
                  <Field label="Actualizado" value={dateText(updatedAt)} />
                  <Field label="Pagado" value={paidAt ? dateText(paidAt) : "No aprobado"} />
                </div>
              </InfoCard>

              <InfoCard title="Datos del analisis">
                <div className="grid gap-3">
                  <Field label="Total multas" value={totalFines || "No informado"} />
                  <Field label="Potencialmente prescritas" value={prescribedCount || "No informado"} />
                  <Field label="Monto potencial" value={potentialAmount ? money(potentialAmount) : "No informado"} />
                  <Field label="UTM prescritas" value={totalUtm || "No informado"} />
                  <Field label="PDF" value={pdfFilename || pdfPath || "No informado"} />
                  <Field label="Fuente" value={source || "Analisis"} />
                </div>
              </InfoCard>

              <InfoCard title="Acciones rapidas">
                <div className="grid gap-3">
                  <ActionButton
                    onClick={() => void postAction(`/api/admin/requests/${encodeURIComponent(requestId)}/resend-email`, "Correo reenviado correctamente")}
                    disabled={actionState.loading || !approved}
                    tone="success"
                  >
                    {actionState.loading ? "Procesando..." : "Reenviar correo"}
                  </ActionButton>

                  <ActionButton onClick={openClientResult} tone="primary">
                    Abrir resultado cliente
                  </ActionButton>

                  <ActionButton onClick={() => void copyText(requestId, "Request ID")}>
                    Copiar Request ID
                  </ActionButton>

                  <ActionButton onClick={() => openPreview("report")}>
                    Previsualizar informe
                  </ActionButton>

                  <ActionButton onClick={() => openPreview("drafts")}>
                    Previsualizar escritos
                  </ActionButton>
                </div>

                <p className="text-sm text-slate-400">
                  El reenvio usa confirmacion de compra. No entrega link directo de descarga.
                </p>
              </InfoCard>
            </section>

            <section className="grid gap-4">
              <InfoCard title="Tabla de multas detectadas">
                <FinesTable fines={fineLogs} />
              </InfoCard>

              <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                
          
<summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-slate-400 transition hover:text-cyan-300">
                  Ver datos tecnicos
                </summary>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <InfoCard title="Detalle normalizado">
                    <JsonBlock value={merged} />
                  </InfoCard>

                  <InfoCard title="Respuesta completa API">
                    <JsonBlock value={payload} />
                  </InfoCard>
                </div>
              </details>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
