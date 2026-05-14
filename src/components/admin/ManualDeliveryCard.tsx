"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type DeliveryMedium = "gmail" | "outlook" | "whatsapp" | "other";

type DeliveryEvent = {
  id?: string;
  request_id?: string;
  medium?: DeliveryMedium | string;
  note?: string | null;
  status?: string;
  created_at?: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  lastEvent?: DeliveryEvent | null;
  events?: DeliveryEvent[];
};

function getRequestIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.requestId;

  if (Array.isArray(raw)) {
    return raw[0] || "";
  }

  return typeof raw === "string" ? raw : "";
}

function formatDate(value?: string | null): string {
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

function getMediumLabel(value?: string): string {
  if (value === "gmail") return "Gmail";
  if (value === "outlook") return "Outlook";
  if (value === "whatsapp") return "WhatsApp";
  if (value === "other") return "Otro";
  return "Sin registro";
}

export default function ManualDeliveryCard() {
  const params = useParams();
  const requestId = useMemo(() => getRequestIdFromParams(params), [params]);

  const [medium, setMedium] = useState<DeliveryMedium>("gmail");
  const [note, setNote] = useState("");
  const [lastEvent, setLastEvent] = useState<DeliveryEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDeliveryEvents() {
    if (!requestId) {
      setLoading(false);
      setErrorMessage("No se detecto requestId.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/delivery-event?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo cargar entrega. HTTP ${response.status}`);
      }

      setLastEvent(data.lastEvent || null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado consultando entrega."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeliveryEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function saveDelivery() {
    if (!requestId) {
      setErrorMessage("No se detecto requestId.");
      return;
    }

    const confirmed = window.confirm(
      "Registrar entrega manual del ZIP/documentos al cliente?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/delivery-event?ts=${Date.now()}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            medium,
            note,
          }),
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo registrar entrega. HTTP ${response.status}`);
      }

      setLastEvent(data.lastEvent || null);
      setMessage(data.message || "Entrega manual registrada correctamente.");
      setNote("");

      window.dispatchEvent(new Event("ptm-management-status-refresh"));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado registrando entrega."
      );
    } finally {
      setSaving(false);
    }
  }

  const hasDelivery = Boolean(lastEvent?.id);

  return (
    <section className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                Entrega manual
              </span>

              <span
                className={
                  hasDelivery
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700"
                    : "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-700"
                }
              >
                {loading ? "Cargando..." : hasDelivery ? "Registrada" : "Pendiente"}
              </span>
            </div>

            <h2 className="mt-2 text-base font-black text-slate-950">
              Registro de entrega final
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Marca cuando el ZIP o documentos fueron enviados manualmente al cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={saveDelivery}
            disabled={loading || saving}
            className="inline-flex min-w-[150px] items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Registrar entrega"}
          </button>
        </div>
      </div>

      <div className="grid gap-2 p-4 md:grid-cols-[1fr_1fr_2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Ultima entrega
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatDate(lastEvent?.created_at)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Medio
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {getMediumLabel(lastEvent?.medium)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Nota registrada
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-900">
            {lastEvent?.note || "Sin nota"}
          </p>
        </div>
      </div>

      <div className="grid gap-2 px-4 pb-4 md:grid-cols-[180px_1fr]">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Medio
          </span>
          <select
            value={medium}
            onChange={(event) => setMedium(event.target.value as DeliveryMedium)}
            disabled={loading || saving}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Otro</option>
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
            placeholder="Ej: ZIP enviado por Gmail con informe e instructivo."
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
          />
        </label>
      </div>

      {message ? (
        <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}