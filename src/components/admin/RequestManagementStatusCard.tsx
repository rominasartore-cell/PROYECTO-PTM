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
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (status === "in_progress") {
    return "border-sky-300 bg-sky-50 text-sky-900";
  }

  if (status === "documents_sent") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  return "border-slate-300 bg-slate-50 text-slate-900";
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
    <div className="my-6 rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-wide text-slate-950">
            Estado interno de gestión
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Control manual del avance operativo de esta solicitud. Esto no modifica Mercado Pago ni el estado del pago.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className={`rounded-xl border p-3 ${getStatusClasses(status)}`}>
              <p className="text-xs font-bold uppercase opacity-70">
                Estado actual
              </p>
              <p className="mt-1 text-base font-black">
                {loading ? "Cargando..." : getStatusLabel(status)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900">
              <p className="text-xs font-bold uppercase text-slate-500">
                Última actualización
              </p>
              <p className="mt-1 text-base font-black">
                {formatDate(updatedAt)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900">
              <p className="text-xs font-bold uppercase text-slate-500">
                Descripción
              </p>
              <p className="mt-1 text-sm font-semibold leading-5">
                {selectedOption?.description || "Sin descripción"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[280px_1fr]">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">
                Cambiar estado
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ManagementStatus)}
                disabled={loading || saving}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">
                Nota interna opcional
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={loading || saving}
                placeholder="Ej: informe en preparación, pendiente revisar PDF, documentos enviados..."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={saveStatus}
          disabled={loading || saving}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar estado"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}