"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<SendState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSend() {
    if (!requestId) {
      setState("error");
      setMessage("No se detectó requestId.");
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
          ? "Guardado en outbox."
          : "Correo enviado correctamente."
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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        right: "24px",
        top: "92px",
        zIndex: 2147483647,
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "auto",
      }}
      className="rounded-2xl border-2 border-emerald-400 bg-white p-4 shadow-2xl"
    >
      <p className="text-sm font-black text-emerald-950">
        Entrega al cliente
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-600">
        Envía el correo de documentos listos para esta solicitud.
      </p>

      <button
        type="button"
        onClick={handleSend}
        disabled={state === "sending"}
        className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "sending"
          ? "Enviando..."
          : state === "sent"
            ? "Correo enviado"
            : "Enviar documentos listos"}
      </button>

      {message ? (
        <p
          className={
            state === "error"
              ? "mt-2 text-xs font-semibold text-red-700"
              : "mt-2 text-xs font-semibold text-emerald-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>,
    document.body
  );
}