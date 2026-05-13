"use client";

import { useEffect, useMemo, useState } from "react";

type ProductDetailModalProps = {
  open: boolean;
  onClose: () => void;
  quoteToken?: string | null;
  requestId?: string | null;
  paymentPayload?: Record<string, unknown>;
};

const PRODUCT_PRICE_CLP = 9990;

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPayloadString(
  payload: Record<string, unknown> | undefined,
  key: string
): string {
  const value = payload?.[key];

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function getPaymentUrl(data: any): string {
  return String(
    data?.checkoutUrl ||
      data?.checkout_url ||
      data?.initPoint ||
      data?.init_point ||
      data?.sandboxInitPoint ||
      data?.sandbox_init_point ||
      data?.redirectUrl ||
      data?.redirect_url ||
      data?.backUrl ||
      data?.back_url ||
      data?.url ||
      data?.preference?.init_point ||
      data?.preference?.sandbox_init_point ||
      data?.preference?.url ||
      ""
  ).trim();
}

export default function ProductDetailModal({
  open,
  onClose,
  quoteToken,
  requestId,
  paymentPayload,
}: ProductDetailModalProps) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const paymentRequestId = useMemo(
    () =>
      requestId ||
      getPayloadString(paymentPayload, "requestId") ||
      getPayloadString(paymentPayload, "request_id") ||
      getPayloadString(paymentPayload, "quoteToken") ||
      getPayloadString(paymentPayload, "quote_token"),
    [paymentPayload, requestId]
  );

  const paymentQuoteToken = useMemo(
    () =>
      quoteToken ||
      getPayloadString(paymentPayload, "quoteToken") ||
      getPayloadString(paymentPayload, "quote_token") ||
      paymentRequestId,
    [paymentPayload, paymentRequestId, quoteToken]
  );

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !paying) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, paying]);

  if (!open) return null;

  async function handlePay() {
    try {
      setPaying(true);
      setError("");

      if (!paymentRequestId && !paymentQuoteToken) {
        throw new Error("No se encontró el código de solicitud para iniciar el pago.");
      }

      const customerEmail = String(
        getPayloadString(paymentPayload, "email") ||
          getPayloadString(paymentPayload, "correo") ||
          getPayloadString(paymentPayload, "customerEmail") ||
          getPayloadString(paymentPayload, "payerEmail")
      ).trim();

      const customerName = String(
        getPayloadString(paymentPayload, "name") ||
          getPayloadString(paymentPayload, "nombre") ||
          getPayloadString(paymentPayload, "customerName")
      ).trim();

      const vehiclePlate = String(
        getPayloadString(paymentPayload, "plate") ||
          getPayloadString(paymentPayload, "patente") ||
          getPayloadString(paymentPayload, "vehiclePlate")
      ).trim();

      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(paymentPayload ?? {}),
          quoteToken: paymentQuoteToken,
          requestId: paymentRequestId || paymentQuoteToken,
          externalReference: paymentRequestId || paymentQuoteToken,
          name: customerName,
          email: customerEmail,
          plate: vehiclePlate,
          product: "informe-completo-prescripcion",
          amount: PRODUCT_PRICE_CLP,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo iniciar el pago. Intenta nuevamente."
        );
      }

      const paymentUrl = getPaymentUrl(data);

      if (!paymentUrl) {
        throw new Error("No se recibió link de pago desde el servidor.");
      }

      if (customerEmail) {
        window.localStorage.setItem("ptm:lastPurchaseEmail", customerEmail);

        if (paymentRequestId) {
          window.localStorage.setItem(
            `ptm:purchaseEmail:${paymentRequestId}`,
            customerEmail
          );
        }
      }

      window.location.href = paymentUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al iniciar el pago."
      );
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          aria-label="Cerrar"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>

        <p className="mb-6 text-sm font-black tracking-[0.16em] text-emerald-600">
          DETALLE DEL PRODUCTO
        </p>

        <div className="mb-7 flex gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <span className="text-3xl font-black text-emerald-700">PTM</span>
          </div>

          <div className="pr-8">
            <h2 className="text-3xl font-black leading-tight text-slate-900">
              Informe completo de análisis + borradores de escritos
            </h2>
            <p className="mt-3 text-lg leading-snug text-slate-500">
              Revisa lo que incluye tu compra antes de continuar al pago.
            </p>
          </div>
        </div>

        <section className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h3 className="mb-4 flex items-center gap-3 text-2xl font-black text-emerald-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm text-white">
              OK
            </span>
            Incluye:
          </h3>

          <ul className="space-y-3 text-base font-medium leading-snug text-slate-700">
            {[
              "Informe de análisis completo del certificado",
              "Detalle y estado de cada multa: potencialmente prescrita o vigente",
              "Borrador editable de solicitud de prescripción",
              "Guía para tramitación personal paso a paso",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 font-black text-emerald-600">OK</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="mb-4 flex items-center gap-3 text-2xl font-black text-amber-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-600 text-amber-700">
              !
            </span>
            Limitaciones:
          </h3>

          <ul className="list-disc space-y-3 pl-6 text-base font-medium leading-snug text-slate-700 marker:text-amber-600">
            <li>Producto informativo y referencial; no garantiza resolución favorable del tribunal.</li>
            <li>La eliminación de las multas del RMNP depende de la resolución del tribunal y/o de las gestiones de la parte interesada.</li>
            <li>Aplica solo según los antecedentes del certificado subido.</li>
            <li>La presentación de los escritos es responsabilidad del solicitante.</li>
            <li>Los escritos se entregan en formato tipo; cada tribunal podría exigir formalidades adicionales.</li>
          </ul>
        </section>

        <section className="mb-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-center">
          <p className="text-lg font-black text-emerald-700">Valor del producto</p>
          <div className="mt-2 flex items-center justify-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-4xl font-black text-white">
              $
            </span>
            <p className="text-6xl font-black tracking-tight text-emerald-700">
              {formatCLP(PRODUCT_PRICE_CLP)}
            </p>
          </div>
          <p className="text-lg font-medium text-slate-600">Pago único</p>
        </section>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="mb-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-5 py-4 text-xl font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>$</span>
          {paying ? "Abriendo pago..." : "Pagar ahora"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          className="w-full rounded-2xl border-2 border-emerald-600 px-5 py-4 text-xl font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          Volver
        </button>

        <p className="mt-4 text-center text-base font-medium text-slate-500">
          Pago seguro vía Mercado Pago
        </p>
      </div>
    </div>
  );
}
