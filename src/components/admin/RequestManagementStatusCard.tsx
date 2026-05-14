"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

const STATUS_OPTIONS: Array<{
  value: ManagementStatus;
  label: string;
  description: string;
}> = [
  {
    value: "pending_review",
    label: "Pendiente de revisión",
    description: "Pago recibido o solicitud creada, pero aún no revisada.",
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

function getStatusClasses(status: ManagementStatus): string {
  if (status === "pending_review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "in_progress") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "documents_sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-800";
}

function getStatusDot(status: ManagementStatus): string {
  if (status === "pending_review") return "bg-amber-500";
  if (status === "in_progress") return "bg-sky-500";
  if (status === "documents_sent") return "bg-emerald-500";
  return "bg-slate-500";
}

function getStatusLabel(status: ManagementStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
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
      setMessage(data.message || "Estado interno actualizado correctamente.");
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
    <section className="my-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                Gestión interna
              </span>

              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(status)}`}>
                <span className={`h-2 w-2 rounded-full ${getStatusDot(status)}`} />
                {loading ? "Cargando..." : getStatusLabel(status)}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-black text-slate-950">
              Estado interno de gestión
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Seguimiento operativo manual de esta solicitud. Sirve para ordenar el trabajo interno sin tocar pagos ni correos automáticos.
            </p>
          </div>

          <button
            type="button"
            onClick={saveStatus}
            disabled={loading || saving}
            className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar estado"}
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className={`rounded-xl border p-4 ${getStatusClasses(status)}`}>
            <p className="text-xs font-black uppercase tracking-wide opacity-70">
              Estado actual
            </p>
            <p className="mt-2 text-base font-black">
              {loading ? "Cargando..." : getStatusLabel(status)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Última actualización
            </p>
            <p className="mt-2 text-base font-black">
              {formatDate(updatedAt)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Descripción
            </p>
            <p className="mt-2 text-sm font-bold leading-5">
              {selectedOption?.description || "Sin descripción"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[280px_1fr]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Cambiar estado
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ManagementStatus)}
              disabled={loading || saving}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Nota interna opcional
            </span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={loading || saving}
              placeholder="Ej: informe en preparación, pendiente revisar PDF, documentos enviados..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </label>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}