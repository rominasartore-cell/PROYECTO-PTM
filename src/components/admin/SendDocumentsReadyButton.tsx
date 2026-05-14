"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

type SendState = "idle" | "sending" | "sent" | "error";

type ApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  provider?: string;
  type?: string;
  id?: string | null;
  outbox?: boolean;
};

function getRequestIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.requestId;

  if (Array.isArray(raw)) {
    return raw[0] || "";
  }

  return typeof raw === "string" ? raw : "";
}

export default function SendDocumentsReadyButton() {
  const params = useParams();
  const requestId = useMemo(() => getRequestIdFromParams(params), [params]);

  const [state, setState] = useState<SendState>("idle");
  const [message, setMessage] = useState("");

  async function handleSend() {
    if (!requestId) {
      setState("error");
      setMessage("No se pudo detectar el requestId.");
      return;
    }

    const confirmed = window.confirm(
      "¿Enviar correo de documentos listos al cliente?"
    );

    if (!confirmed) {
      return;
    }

    setState("sending");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(
          requestId
        )}/send-documents-ready?ts=${Date.now()}`,
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

      setState("sent");
      setMessage(
        data.outbox
          ? "Correo guardado en outbox para envío posterior."
          : "Correo de documentos listos enviado correctamente."
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado enviando correo."
      );
    }
  }

  const disabled = state === "sending";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-950">
            Entrega al cliente
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Envía el correo de “documentos listos” sin tocar Mercado Pago ni el
            estado del pago.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "sending"
            ? "Enviando..."
            : state === "sent"
              ? "Correo enviado"
              : "Enviar correo documentos listos"}
        </button>
      </div>

      {message ? (
        <p
          className={
            state === "error"
              ? "mt-3 text-xs font-semibold text-red-700"
              : "mt-3 text-xs font-semibold text-emerald-800"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}