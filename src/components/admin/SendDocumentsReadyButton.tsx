"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type SendState = "idle" | "loading" | "sending" | "sent" | "error";

type EmailEvent = {
  id?: string;
  request_id?: string;
  email?: string;
  type?: string;
  provider?: string;
  provider_id?: string;
  outbox?: boolean;
  status?: string;
  message?: string;
  error?: string | null;
  created_at?: string;
  metadata?: {
    plate?: string;
    amount?: number | string;
    source?: string;
  };
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  provider?: string;
  id?: string | null;
  outbox?: boolean;
  lastEvent?: EmailEvent | null;
  events?: EmailEvent[];
};

function getRequestIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.requestId;

  if (Array.isArray(raw)) {
    return raw[0] || "";
  }

  return typeof raw === "string" ? raw : "";
}

function formatDate(value?: string): string {
  if (!value) {
    return "Sin registro";
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

function getStatusLabel(event: EmailEvent | null): string {
  if (!event) {
    return "Pendiente";
  }

  if (event.status === "sent") {
    return "Enviado";
  }

  if (event.status === "failed") {
    return "Fallido";
  }

  return event.status || "Registrado";
}

export default function SendDocumentsReadyButton() {
  const params = useParams();
  const requestId = useMemo(() => getRequestIdFromParams(params), [params]);

  const [state, setState] = useState<SendState>("idle");
  const [message, setMessage] = useState("");
  const [lastEvent, setLastEvent] = useState<EmailEvent | null>(null);

  async function loadLastEvent() {
    if (!requestId) {
      return;
    }

    try {
      setState((current) => (current === "sending" ? current : "loading"));

      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/send-documents-ready?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (response.ok && data?.ok) {
        setLastEvent(data.lastEvent || null);
      }

      setState("idle");
    } catch {
      setState("idle");
    }
  }

  useEffect(() => {
    loadLastEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleSend() {
    if (!requestId) {
      setState("error");
      setMessage("No se pudo detectar el requestId.");
      return;
    }

    const alreadySent = Boolean(lastEvent?.id);
    const confirmed = window.confirm(
      alreadySent
        ? "Ya existe un correo de documentos listos registrado. ¿Quieres reenviarlo?"
        : "¿Enviar correo de documentos listos al cliente?"
    );

    if (!confirmed) {
      return;
    }

    setState("sending");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/send-documents-ready?ts=${Date.now()}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `No se pudo enviar el correo. HTTP ${response.status}`
        );
      }

      setLastEvent(data.lastEvent || null);
      setState("sent");
      setMessage(
        data.outbox
          ? "Correo guardado en outbox."
          : "Correo de documentos listos enviado."
      );

      await loadLastEvent();

      window.dispatchEvent(new Event("ptm-management-status-refresh"));
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado enviando correo."
      );
    }
  }

  const hasEvent = Boolean(lastEvent?.id);
  const isFailed = lastEvent?.status === "failed";
  const isLoading = state === "loading";
  const statusLabel = getStatusLabel(lastEvent);

  return (
    <section className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-emerald-50 to-white px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-800">
                Entrega
              </span>
              <span
                className={
                  isFailed
                    ? "rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-700"
                    : hasEvent
                      ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700"
                      : "rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-700"
                }
              >
                {isLoading ? "Cargando..." : statusLabel}
              </span>
            </div>

            <h2 className="mt-2 text-base font-black text-slate-950">
              Estado de entrega
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Control del correo de documentos listos. No modifica pagos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={state === "sending" || state === "loading"}
            className="inline-flex min-w-[170px] items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "sending"
              ? "Enviando..."
              : hasEvent
                ? "Reenviar correo"
                : "Enviar correo"}
          </button>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Último correo
          </p>
          <p className={isFailed ? "mt-1 text-sm font-black text-red-700" : "mt-1 text-sm font-black text-teal-700"}>
            {hasEvent ? statusLabel : "Sin envío"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Fecha
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatDate(lastEvent?.created_at)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Email
          </p>
          <p className="mt-1 break-all text-xs font-black text-slate-900">
            {lastEvent?.email || "Sin registro"}
          </p>
        </div>
      </div>

      {message ? (
        <div
          className={
            state === "error"
              ? "mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
              : "mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
          }
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}