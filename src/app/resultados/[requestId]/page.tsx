"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type NormalizedStatus = "approved" | "pending" | "rejected" | "cancelled" | "in_process" | "unknown";

type PaymentStatusResponse = {
  ok?: boolean;
  found?: boolean;
  requestId?: string;
  status?: string | null;
  error?: string | null;
  payment?: {
    status?: string | null;
    amount?: number | null;
    customerEmail?: string | null;
    customerName?: string | null;
    preferenceId?: string | null;
    paymentId?: string | null;
    mock?: boolean | null;
    sandbox?: boolean | null;
    paidAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

type StatusCopy = {
  title: string;
  badge: string;
  message: string;
  detail: string;
  panelClass: string;
  badgeClass: string;
};

const SUPPORT_EMAIL = "contacto@prescribetumulta.cl";

function normalizeStatus(value: unknown): NormalizedStatus {
  const normalized = String(value || "")
    .toLowerCase()
    .trim();

  if (["approved", "paid", "success", "accredited"].includes(normalized)) return "approved";
  if (["rejected", "failure", "failed"].includes(normalized)) return "rejected";
  if (["cancelled", "canceled"].includes(normalized)) return "cancelled";
  if (["in_process", "processing", "authorized"].includes(normalized)) return "in_process";
  if (["pending", "created", "unknown", ""].includes(normalized)) return "pending";

  return "unknown";
}

function safeApprovedStatus(data: PaymentStatusResponse | null, queryStatus: string | null): NormalizedStatus {
  const serverStatus = data?.payment?.status ?? data?.status ?? null;
  const serverNormalized = normalizeStatus(serverStatus);
  const queryNormalized = normalizeStatus(queryStatus);

  if (data?.found === true || data?.payment) {
    return serverNormalized;
  }

  if (data?.found === false) {
    return serverNormalized === "approved" ? "pending" : serverNormalized;
  }

  return queryNormalized === "approved" ? "pending" : queryNormalized;
}

function getStatusCopy(status: NormalizedStatus, hasConfirmedRecord: boolean): StatusCopy {
  if (status === "approved" && hasConfirmedRecord) {
    return {
      title: "Pago confirmado",
      badge: "Aprobado",
      message: "Tu compra fue registrada correctamente.",
      detail:
        "El comprobante quedó asociado a esta solicitud. El informe completo y los borradores se enviarán al correo registrado cuando estén disponibles.",
      panelClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
    };
  }

  if (status === "rejected") {
    return {
      title: "Pago rechazado",
      badge: "Rechazado",
      message: "Mercado Pago no aprobó la operación.",
      detail:
        "Puedes volver al resultado preliminar e intentar nuevamente. Si el banco sí descontó dinero, revisa el comprobante de Mercado Pago antes de repetir el pago.",
      panelClass: "border-red-200 bg-red-50 text-red-950",
      badgeClass: "border-red-300 bg-red-100 text-red-900",
    };
  }

  if (status === "cancelled") {
    return {
      title: "Pago cancelado",
      badge: "Cancelado",
      message: "La compra no se completó.",
      detail:
        "No encontramos un pago aprobado asociado a esta solicitud. Puedes volver al inicio y repetir el proceso si todavía quieres comprar el informe.",
      panelClass: "border-slate-200 bg-slate-50 text-slate-950",
      badgeClass: "border-slate-300 bg-slate-100 text-slate-900",
    };
  }

  if (status === "in_process") {
    return {
      title: "Pago en revisión",
      badge: "En revisión",
      message: "Mercado Pago todavía está procesando la operación.",
      detail:
        "Actualiza esta página en unos minutos. Si el estado cambia a aprobado, el sistema lo registrará internamente y no dependerá del texto de la URL.",
      panelClass: "border-amber-200 bg-amber-50 text-amber-950",
      badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
    };
  }

  return {
    title: "Pago pendiente",
    badge: "Pendiente",
    message: "Todavía no encontramos una confirmación de pago aprobada.",
    detail:
      "Este estado se toma desde el registro interno del proyecto, no solo desde el parámetro de retorno de Mercado Pago. Si ya pagaste, actualiza la página o contacta soporte con el código de solicitud.",
    panelClass: "border-amber-200 bg-amber-50 text-amber-950",
    badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
  };
}

function money(value: unknown): string {
  const amount = Number(value || 0);

  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function dateText(value?: string | null): string {
  if (!value) return "No registrado";

  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ResultadosContent() {
  const params = useParams<{ requestId?: string | string[] }>();
  const searchParams = useSearchParams();

  const requestId = useMemo(() => {
    const raw = params?.requestId;

    if (Array.isArray(raw)) return raw[0] || "";
    return typeof raw === "string" ? raw : "";
  }, [params]);

  const queryStatus = searchParams.get("status");
  const queryEmail = searchParams.get("email");
  const queryMock = searchParams.get("mock");

  const [data, setData] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const loadPaymentStatus = useCallback(async () => {
    if (!requestId) {
      setData({
        ok: false,
        found: false,
        requestId: "",
        status: "pending",
        error: "No se recibió código de solicitud.",
      });
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    try {
      setLoading(true);

      const response = await fetch(
        `/api/payment/status/${encodeURIComponent(requestId)}?ts=${Date.now()}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const json = (await response.json().catch(() => null)) as PaymentStatusResponse | null;

      if (!json) {
        setData({
          ok: false,
          found: false,
          requestId,
          status: "pending",
          error: "La respuesta del servidor no fue válida.",
        });
        return;
      }

      setData(json);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      setData({
        ok: false,
        found: false,
        requestId,
        status: "pending",
        error: "No fue posible consultar el estado interno del pago.",
      });
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadPaymentStatus();
  }, [loadPaymentStatus, refreshCount]);

  const hasConfirmedRecord = data?.found === true || Boolean(data?.payment);
  const status = safeApprovedStatus(data, queryStatus);
  const copy = getStatusCopy(status, hasConfirmedRecord);

  const email = String(data?.payment?.customerEmail || queryEmail || "").trim();
  const amount = data?.payment?.amount ?? null;
  const preferenceId = String(data?.payment?.preferenceId || "").trim();
  const paymentId = String(data?.payment?.paymentId || "").trim();
  const isMock = Boolean(data?.payment?.mock) || queryMock === "true";
  const isSandbox = Boolean(data?.payment?.sandbox);

  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Soporte compra PTM ${requestId || "sin codigo"}`
  )}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                Prescribe tu Multa
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                {loading ? "Consultando estado del pago" : copy.title}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Estado de compra asociado a tu solicitud de análisis de multas. La confirmación se valida contra el registro interno del sistema.
              </p>
            </div>

            <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${copy.badgeClass}`}>
              {loading ? "Consultando" : copy.badge}
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className={`rounded-3xl border p-5 text-sm leading-7 ${copy.panelClass}`}>
            {loading ? (
              <>
                <p className="font-black">Revisando registro interno...</p>
                <p className="mt-2">Estamos consultando el estado real guardado para esta solicitud.</p>
              </>
            ) : (
              <>
                <p className="font-black">{copy.message}</p>
                <p className="mt-2">{copy.detail}</p>
              </>
            )}
          </div>

          {data?.error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-950">
              <p className="font-black">Aviso técnico</p>
              <p className="mt-2">{data.error}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Código de solicitud" value={requestId || "No disponible"} />
            <DetailRow label="Correo informado" value={email || "No disponible"} />
            <DetailRow label="Monto registrado" value={amount ? money(amount) : "No registrado"} />
            <DetailRow label="Última actualización" value={dateText(data?.payment?.updatedAt)} />
          </div>

          {(preferenceId || paymentId || isMock || isSandbox) && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Datos de pago
              </p>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p className="break-all">
                  <span className="font-black text-slate-950">Preference ID:</span> {preferenceId || "No registrado"}
                </p>
                <p className="break-all">
                  <span className="font-black text-slate-950">Payment ID:</span> {paymentId || "No registrado"}
                </p>
                <p>
                  <span className="font-black text-slate-950">Modo mock:</span> {isMock ? "Sí" : "No"}
                </p>
                <p>
                  <span className="font-black text-slate-950">Sandbox:</span> {isSandbox ? "Sí" : "No"}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            <p className="font-black">Importante</p>
            <p className="mt-2">
              Revisa spam, promociones y correo no deseado. Si no recibes confirmación, escribe a {SUPPORT_EMAIL} indicando el código de solicitud.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRefreshCount((current) => current + 1)}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Consultando..." : "Actualizar estado"}
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Volver al inicio
            </a>

            <a
              href={supportHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResultadoPagoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-slate-600">Cargando resultado de pago...</p>
          </section>
        </main>
      }
    >
      <ResultadosContent />
    </Suspense>
  );
}
