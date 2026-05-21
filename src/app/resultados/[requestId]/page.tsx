"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { trackPaymentApproved } from "@/lib/analytics";

type NormalizedStatus = "approved" | "pending" | "rejected" | "cancelled" | "in_process" | "unknown";

type PaymentStatusResponse = {
  ok?: boolean;
  found?: boolean;
  requestId?: string;
  status?: string | null;
  purchaseStatus?: string | null;
  error?: string | null;
  payment?: {
    status?: string | null;
    rawStatus?: string | null;
    statusDetail?: string | null;
    amount?: number | null;
    customerEmail?: string | null;
    customerName?: string | null;
    preferenceId?: string | null;
    paymentId?: string | null;
    product?: string | null;
    prescribedCount?: number | null;
    totalMultas?: number | null;
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
        "El comprobante quedó asociado a esta solicitud. El informe completo y las solicitudes editables se enviarán al correo registrado cuando estén disponibles.",
      panelClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
    };
  }

  if (status === "rejected") {
    return {
      title: "Pago rechazado",
      badge: "Rechazado",
      message: "Mercado Pago rechazó la operación.",
      detail:
        "No se registró una compra aprobada. Puedes intentar nuevamente usando tu medio de pago habitual, otro dispositivo o contactar soporte si tienes dudas.",
      panelClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
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
      panelClass: "border-teal-200 bg-teal-50 text-teal-950",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
    };
  }

  return {
    title: "Pago pendiente",
    badge: "Pendiente",
    message: "Todavía no encontramos una confirmación de pago aprobada.",
    detail:
      "Este estado se toma desde el registro interno del proyecto, no solo desde el parámetro de retorno de Mercado Pago. Si ya pagaste, actualiza la página o contacta soporte con el código de solicitud.",
    panelClass: "border-teal-200 bg-teal-50 text-teal-950",
    badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
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

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(
      value
        .replace(/[^\d,.-]/g, "")
        .replace(/\.(?=\d{3}(\D|$))/g, "")
        .replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isPaidPurchaseStatus(value: unknown): boolean {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return ["paid", "approved", "accredited", "success"].includes(normalized);
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

  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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
  const product = String(data?.payment?.product || "").trim();
    const productLower = product.toLowerCase();
const analyticsValue = Number(amount || 0);
  const analyticsProduct =
    product ||
    (analyticsValue === 5990
      ? "informe-simple-revision"
      : analyticsValue === 9990
        ? "informe-completo-prescripcion"
        : "unknown");
  const paymentStatus = String(data?.payment?.status || data?.status || status || "").trim();
  const purchaseStatus = String(
    data?.purchaseStatus || (status === "approved" ? "paid" : status)
  ).trim();
  const prescribedCount = numberValue(data?.payment?.prescribedCount);
  const rawStatus = String(data?.payment?.rawStatus || "").trim();
  const statusDetail = String(data?.payment?.statusDetail || "").trim();
  const preferenceId = String(data?.payment?.preferenceId || "").trim();
  const paymentId = String(data?.payment?.paymentId || "").trim();
  const isMock = Boolean(data?.payment?.mock) || queryMock === "true";
  const isSandbox = Boolean(data?.payment?.sandbox);

    useEffect(() => {
    if (loading) return;
    if (!requestId) return;
    if (!hasConfirmedRecord) return;
    if (status !== "approved") return;
    if (!isPaidPurchaseStatus(purchaseStatus)) return;

    const storageKey = `ptm_payment_approved_${requestId}`;

    try {
      const alreadyTracked =
        window.localStorage.getItem(storageKey) === "1" ||
        window.sessionStorage.getItem(storageKey) === "1";

      if (alreadyTracked) return;

      window.sessionStorage.setItem(storageKey, "1");
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Si storage no está disponible, igual enviamos el evento.
    }

    trackPaymentApproved({
      request_id: requestId,
      product: analyticsProduct,
      value: analyticsValue,
      currency: "CLP",
      payment_status: paymentStatus || "approved",
      purchase_status: purchaseStatus || "paid",
      prescribed_count: prescribedCount,
      amount: analyticsValue,
      status: "approved",
      mercado_pago_status: rawStatus || "approved",
      mercado_pago_status_detail: statusDetail || "",
      mock: isMock,
      sandbox: isSandbox,
    });
  }, [
    analyticsProduct,
    analyticsValue,
    hasConfirmedRecord,
    isMock,
    isSandbox,
    loading,
    paymentStatus,
    prescribedCount,
    purchaseStatus,
    rawStatus,
    requestId,
    status,
    statusDetail,
  ]);

  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Soporte compra PTM ${requestId || "sin codigo"}`
  )}`;
  // PAYWALL V1.5-B4 RESULTADOS ESCALONADOS
  const paidConfirmed =
    status === "approved" &&
    hasConfirmedRecord &&
    isPaidPurchaseStatus(purchaseStatus);

  const isPreliminaryAccess =
    paidConfirmed && productLower === "analisis-preliminar-detallado";

  // Full access solo para producto completo o pagos legacy que no sean preliminares.
  const isApprovedAccess =
    paidConfirmed && productLower !== "analisis-preliminar-detallado";

  const startCheckout = useCallback(async (targetProduct = "informe-completo-prescripcion") => {
    if (!requestId) {
      setCheckoutError("No se encontró el código de solicitud.");
      return;
    }

    if (!email) {
      setCheckoutError("Falta el correo asociado a esta solicitud. Vuelve al inicio y repite el análisis.");
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          email,
          customerEmail: email,
          product: targetProduct,
        }),
      });

      const json = await response.json().catch(() => null);
      const checkoutUrl =
        json?.checkoutUrl ||
        json?.init_point ||
        json?.initPoint ||
        json?.url ||
        json?.preference?.init_point ||
        json?.preference?.sandbox_init_point ||
        null;

      if (!response.ok || !checkoutUrl) {
        throw new Error(
          json?.error ||
            json?.message ||
            "No se pudo crear el checkout de pago."
        );
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "No se pudo iniciar el pago."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }, [email, requestId]);
  if (!loading && isPreliminaryAccess) {
    const paymentAny = (data?.payment || {}) as Record<string, unknown>;
    const metadataAny = (paymentAny.metadata || {}) as Record<string, unknown>;

    const pickNumber = (...values: unknown[]) => {
      for (const value of values) {
        const n = Number(value || 0);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return 0;
    };

    const totalMultas = pickNumber(
      paymentAny.totalMultas,
      metadataAny.totalMultas,
      metadataAny.total_multas
    );

    const multasSusceptibles = pickNumber(
      paymentAny.prescribedCount,
      paymentAny.potentiallyPrescribedCount,
      metadataAny.multasSusceptibles,
      metadataAny.multas_susceptibles,
      metadataAny.potentiallyPrescribedCount
    );

    const montoReferencial = pickNumber(
      paymentAny.potentialAmount,
      paymentAny.totalPotentialAmount,
      metadataAny.potentialAmount,
      metadataAny.totalPotentialAmount,
      metadataAny.montoPotencial,
      metadataAny.monto_potencial
    );

    const moneyText = (value: number) =>
      value > 0 ? money(value) : "No informado";

    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-300">
              Análisis preliminar desbloqueado
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Resultado preliminar detallado
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Este resumen muestra señales generales del certificado. Los documentos editables y la guía completa se desbloquean con el informe completo.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailRow
                label="Multas detectadas"
                value={totalMultas > 0 ? String(totalMultas) : "No informado"}
              />
              <DetailRow
                label="Potencialmente revisables"
                value={multasSusceptibles > 0 ? String(multasSusceptibles) : "No informado"}
              />
              <DetailRow
                label="Monto referencial"
                value={moneyText(montoReferencial)}
              />
            </div>

            <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm leading-7 text-teal-950">
              <p className="font-black">Conclusión preliminar</p>
              <p className="mt-2">
                El sistema detectó antecedentes que justifican una revisión documental. Para recibir el informe completo, solicitudes editables y guía de tramitación, desbloquea el paquete completo.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              <p className="font-black">Importante</p>
              <p className="mt-2">
                Este análisis preliminar no constituye eliminación automática de multas, representación judicial ni garantía de resultado. La decisión corresponde al tribunal competente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => startCheckout("informe-completo-prescripcion")}
              disabled={checkoutLoading || !requestId}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-300 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading
                ? "Generando pago..."
                : "Comprar informe completo — $9.990"}
            </button>

            {checkoutError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                {checkoutError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setRefreshCount((value) => value + 1)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-800 transition hover:border-teal-400 hover:text-teal-800"
            >
              Actualizar estado de pago
            </button>
          </div>
        </section>
      </main>
    );
  }



  if (!loading && !isApprovedAccess) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-300">
              Certificado revisado
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Tu certificado fue revisado correctamente
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Detectamos multas que podrían prescribir.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Conoce el detalle de tu análisis preliminar
              </p>
              <p className="mt-3 text-lg font-black">
                Por $2.990 podrás ver multas detectadas, posibles multas prescritas, monto referencial estimado y recomendación inicial.
              </p>
              <p className="mt-3 text-sm leading-6 text-amber-900">
                Luego, puedes optar por un informe completo con documentos editables.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Solicitud" value={requestId || "No registrada"} />
              <DetailRow label="Estado de pago" value={copy.badge} />
            </div>

            <button
              type="button"
              onClick={() => startCheckout("analisis-preliminar-detallado")}
              disabled={checkoutLoading || !requestId}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-300 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading ? "Generando pago..." : "Conocer detalle del análisis — $2.990"}
            </button>

            {checkoutError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                {checkoutError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setRefreshCount((value) => value + 1)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-800 transition hover:border-teal-400 hover:text-teal-800"
            >
              Actualizar estado de pago
            </button>

            <a
              href={supportHref}
              className="block text-center text-sm font-black text-teal-700 underline"
            >
              Contactar soporte
            </a>
          </div>
        </section>
      </main>
    );
  }



  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-300">
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
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">
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

                {rawStatus ? (
                  <p className="break-all">
                    <span className="font-black text-slate-950">Estado Mercado Pago:</span> {rawStatus}
                  </p>
                ) : null}

                {statusDetail ? (
                  <p className="break-all">
                    <span className="font-black text-slate-950">Detalle Mercado Pago:</span> {statusDetail}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm leading-7 text-teal-950">
            <p className="font-black">Importante</p>
            <p className="mt-2">
              Revisa spam, promociones y correo no deseado. Si no recibes confirmación, escribe a {SUPPORT_EMAIL} indicando el código de solicitud.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRefreshCount((current) => current + 1)}
              className="inline-flex items-center justify-center rounded-2xl bg-teal-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Consultando..." : "Actualizar estado"}
            </button>

            {status === "approved" && hasConfirmedRecord ? (
              <a
                href={`/resultados/${encodeURIComponent(requestId)}/datos`}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Completar datos para documentos
              </a>
            ) : null}

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
