"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const ADMIN_TOKEN_KEY = "ptm-admin-token";

type JsonRecord = Record<string, unknown>;

type ManagementStatus =
  | "pending_review"
  | "in_progress"
  | "documents_sent"
  | "closed";

type ApiResponse = {
  ok?: boolean;
  found?: boolean;
  status?: ManagementStatus;
  label?: string;
  note?: string;
  updatedAt?: string | null;
  error?: string;
  message?: string;
};

type PaidVerification = {
  loading: boolean;
  checked: boolean;
  approved: boolean;
  status: string;
  paidAt: string;
  amount: number;
  product: string;
  customerEmail: string;
  error: string;
};

const INITIAL_PAID_VERIFICATION: PaidVerification = {
  loading: true,
  checked: false,
  approved: false,
  status: "",
  paidAt: "",
  amount: 0,
  product: "",
  customerEmail: "",
  error: "",
};

const STATUS_OPTIONS: Array<{
  value: ManagementStatus;
  label: string;
  description: string;
}> = [
  {
    value: "pending_review",
    label: "Pendiente de revisión",
    description: "Solicitud creada o pagada, aún no revisada.",
  },
  {
    value: "in_progress",
    label: "En preparación",
    description: "Caso en revisión o documentos en preparación.",
  },
  {
    value: "documents_sent",
    label: "Documentos enviados",
    description: "Informe o documentos ya enviados al cliente.",
  },
  {
    value: "closed",
    label: "Cerrado",
    description: "Gestión terminada.",
  },
];

function getRequestIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.requestId;

  if (Array.isArray(raw)) {
    return raw[0] || "";
  }

  return typeof raw === "string" ? raw : "";
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function buildAdminHeaders(): HeadersInit {
  const token = getAdminToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function pickString(record: JsonRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];

    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }

  return fallback;
}

function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];

    if (value === null || value === undefined || value === "") continue;

    const normalized =
      typeof value === "string"
        ? value.replace(/\./g, "").replace(",", ".")
        : value;

    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function isApprovedStatus(value?: string | null): boolean {
  const status = String(value || "").toLowerCase();
  return status === "approved" || status === "paid" || status === "completed";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Sin actualización";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusClasses(status: ManagementStatus): string {
  if (status === "pending_review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "in_progress") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (status === "documents_sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-800";
}

function getStatusDot(status: ManagementStatus): string {
  if (status === "pending_review") return "bg-amber-500";
  if (status === "in_progress") return "bg-teal-500";
  if (status === "documents_sent") return "bg-emerald-500";
  return "bg-slate-500";
}

function getStatusLabel(status: ManagementStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function getNextStepText(status: ManagementStatus): string {
  if (status === "documents_sent") {
    return "Entrega registrada: los documentos ya figuran como enviados.";
  }

  if (status === "closed") {
    return "Gestión cerrada: no quedan acciones obligatorias pendientes.";
  }

  if (status === "in_progress") {
    return "Siguiente paso: terminar preparación, validar ZIP y enviar documentos listos.";
  }

  return "Siguiente paso: revisar datos del cliente y preparar entrega documental.";
}

function getNoticeClasses(status: ManagementStatus): string {
  if (status === "documents_sent" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "in_progress") {
    return "border-teal-200 bg-teal-50 text-teal-900";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function getNoticeBadge(status: ManagementStatus): string {
  if (status === "documents_sent" || status === "closed") {
    return "Entrega registrada";
  }

  if (status === "in_progress") {
    return "En preparación";
  }

  return "Pendiente de preparar";
}

export default function RequestManagementStatusCard() {
  const params = useParams();
  const requestId = useMemo(() => getRequestIdFromParams(params), [params]);

  const [status, setStatus] = useState<ManagementStatus>("pending_review");
  const [note, setNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [paidVerification, setPaidVerification] = useState<PaidVerification>(
    INITIAL_PAID_VERIFICATION
  );

  async function loadPaidVerification() {
    if (!requestId) {
      setPaidVerification({
        ...INITIAL_PAID_VERIFICATION,
        loading: false,
        checked: true,
        error: "No se detectó requestId.",
      });
      return;
    }

    setPaidVerification((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const query = new URLSearchParams({
        search: requestId,
        limit: "100",
        ts: String(Date.now()),
      });

      const response = await fetch(`/api/admin/requests?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: buildAdminHeaders(),
      });

      const data = (await response.json().catch(() => null)) as any;

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            `No se pudo verificar pago. HTTP ${response.status}`
        );
      }

      const rows = Array.isArray(data?.requests)
        ? data.requests
        : Array.isArray(data?.data)
          ? data.data
          : data?.data
            ? [data.data]
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

          return candidates.some(
            (value) => String(value || "").trim() === requestId
          );
        }) ||
        rows[0] ||
        null;

      if (!found) {
        setPaidVerification({
          ...INITIAL_PAID_VERIFICATION,
          loading: false,
          checked: true,
          error: "No se encontró la solicitud para verificar pago.",
        });
        return;
      }

      const payment = asRecord(found.payment);
      const merged = {
        ...payment,
        ...asRecord(found),
      };

      const commercialStatus = pickString(
        merged,
        [
          "payment_status",
          "paymentStatus",
          "purchase_status",
          "purchaseStatus",
          "status",
        ],
        ""
      );

      setPaidVerification({
        loading: false,
        checked: true,
        approved: isApprovedStatus(commercialStatus),
        status: commercialStatus,
        paidAt: pickString(
          merged,
          ["payment_paid_at", "paymentPaidAt", "paid_at", "paidAt"],
          ""
        ),
        amount: pickNumber(
          merged,
          ["payment_amount", "paymentAmount", "amount", "transaction_amount"],
          0
        ),
        product: pickString(merged, ["product", "payment_product"], ""),
        customerEmail: pickString(
          merged,
          [
            "customer_email",
            "customerEmail",
            "payment_customer_email",
            "paymentCustomerEmail",
            "email",
          ],
          ""
        ),
        error: "",
      });
    } catch (error) {
      setPaidVerification({
        ...INITIAL_PAID_VERIFICATION,
        loading: false,
        checked: true,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado verificando pago.",
      });
    }
  }

  async function loadStatus() {
    if (!requestId) {
      setLoading(false);
      setErrorMessage("No se detectó requestId.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/management-status?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo cargar el estado. HTTP ${response.status}`);
      }

      setStatus(data.status || "pending_review");
      setNote(data.note || "");
      setUpdatedAt(data.updatedAt || null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado cargando estado interno."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadPaidVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    function handleRefresh() {
      loadStatus();
      loadPaidVerification();
    }

    window.addEventListener("ptm-management-status-refresh", handleRefresh);

    return () => {
      window.removeEventListener("ptm-management-status-refresh", handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function saveStatus() {
    if (!requestId) {
      setErrorMessage("No se detectó requestId.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/management-status?ts=${Date.now()}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            note,
          }),
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo guardar el estado. HTTP ${response.status}`);
      }

      setStatus(data.status || status);
      setNote(data.note || note);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setMessage(data.message || "Estado interno actualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado guardando estado interno."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = STATUS_OPTIONS.find((item) => item.value === status);

  return (
    <section className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                Gestión
              </span>

              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getStatusClasses(status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
                {loading ? "Cargando..." : getStatusLabel(status)}
              </span>
            </div>

            <h2 className="mt-2 text-base font-black text-slate-950">
              Estado interno
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Seguimiento operativo manual de esta solicitud.
            </p>
          </div>

          <button
            type="button"
            onClick={saveStatus}
            disabled={loading || saving}
            className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {paidVerification.loading ? (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            Verificando pago de la solicitud...
          </div>
        ) : paidVerification.approved ? (
          <div className={`mb-3 rounded-lg border px-3 py-3 ${getNoticeClasses(status)}`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                    Solicitud pagada verificada
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                    {getNoticeBadge(status)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-black">
                  Pago aprobado confirmado. {getNextStepText(status)}
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
                  Revisa datos del cliente, previsualiza informe y escritos, genera la entrega local, valida el ZIP y luego envía “documentos listos”.
                </p>
              </div>

              <div className="grid min-w-[160px] gap-1 text-xs font-bold md:text-right">
                <span>{formatMoney(paidVerification.amount)}</span>
                <span>{paidVerification.paidAt ? formatDate(paidVerification.paidAt) : "Pago sin fecha"}</span>
                {paidVerification.product ? <span>{paidVerification.product}</span> : null}
              </div>
            </div>
          </div>
        ) : paidVerification.error ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            No se pudo verificar pago desde esta tarjeta: {paidVerification.error}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-[1fr_1fr_2fr]">
          <div className={`rounded-lg border px-3 py-2.5 ${getStatusClasses(status)}`}>
            <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
              Estado actual
            </p>
            <p className="mt-1 text-sm font-black">
              {loading ? "Cargando..." : getStatusLabel(status)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Actualización
            </p>
            <p className="mt-1 text-sm font-black">
              {formatDate(updatedAt)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Descripción
            </p>
            <p className="mt-1 text-xs font-bold leading-5">
              {selectedOption?.description || "Sin descripción"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[240px_1fr]">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Cambiar estado
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ManagementStatus)}
              disabled={loading || saving}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Nota interna opcional
            </span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={loading || saving}
              placeholder="Ej: informe en preparación, pendiente revisar PDF..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            />
          </label>
        </div>

        {message ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
