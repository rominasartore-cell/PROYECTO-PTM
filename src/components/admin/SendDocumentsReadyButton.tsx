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
        setState("idle");
        return;
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
          ? "Correo guardado en outbox para envío posterior."
          : "Correo de documentos listos enviado correctamente."
      );

      await loadLastEvent();
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
  const statusLabel = getStatusLabel(lastEvent);
  const isFailed = lastEvent?.status === "failed";

  return (
    <div className="my-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-950">
            Estado de entrega
          </p>

          <p className="mt-1 text-sm leading-6 text-emerald-900">
            Control del correo de <strong>documentos listos</strong>. No modifica Mercado Pago ni el estado del pago.
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100">
              <p className="text-xs font-bold uppercase text-slate-500">
                Último correo
              </p>
              <p className={isFailed ? "mt-1 font-black text-red-700" : "mt-1 font-black text-emerald-800"}>
                {hasEvent ? statusLabel : "Sin envío registrado"}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100">
              <p className="text-xs font-bold uppercase text-slate-500">
                Fecha
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {formatDate(lastEvent?.created_at)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100">
              <p className="text-xs font-bold uppercase text-slate-500">
                Proveedor
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {lastEvent?.provider || "Sin registro"}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100">
              <p className="text-xs font-bold uppercase text-slate-500">
                Email
              </p>
              <p className="mt-1 break-all font-bold text-slate-900">
                {lastEvent?.email || "Sin registro"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={state === "sending" || state === "loading"}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "sending"
            ? "Enviando..."
            : hasEvent
              ? "Reenviar documentos listos"
              : "Enviar documentos listos"}
        </button>
      </div>

      {state === "loading" ? (
        <p className="mt-3 text-sm font-bold text-emerald-800">
          Cargando estado de entrega...
        </p>
      ) : null}

      {message ? (
        <p
          className={
            state === "error"
              ? "mt-3 text-sm font-bold text-red-700"
              : "mt-3 text-sm font-bold text-emerald-800"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}