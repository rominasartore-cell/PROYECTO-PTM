"use client";

import { useEffect, useMemo, useState } from "react";
import { trackPaymentRedirect, trackPurchaseClicked } from "@/lib/analytics";

type ProductKind =
  | "informe-completo-prescripcion"
  | "informe-fecha-estimada-prescripcion";

type ProductDetailModalProps = {
  open: boolean;
  onClose: () => void;
  quoteToken?: string | null;
  requestId?: string | null;
  paymentPayload?: Record<string, unknown>;
  product?: ProductKind;
};

const PRODUCT_CONFIG: Record<
  ProductKind,
  {
    id: ProductKind;
    price: number;
    eyebrow: string;
    title: string;
    description: string;
    priceNote: string;
    buttonLabel: string;
    includedItems: string[];
    excludedItems: string[];
    legalNote: string;
  }
> = {
  "informe-completo-prescripcion": {
    id: "informe-completo-prescripcion",
    price: 9990,
    eyebrow: "Oferta de lanzamiento",
    title: "Informe completo de análisis + solicitudes editables",
    description:
      "Revisa el valor, compra el informe y luego descarga/recibe el detalle preparado con los antecedentes de tu certificado.",
    priceNote: "Precio único por informe completo + solicitudes editables.",
    buttonLabel: "Comprar informe",
    includedItems: [
      "Informe completo de análisis del certificado.",
      "Detalle de multas detectadas y estado estimado.",
      "Identificación de multas potencialmente prescritas.",
      "Solicitud editable de prescripción.",
      "Guía de tramitación personal paso a paso.",
    ],
    excludedItems: [
      "No incluye representación judicial ni patrocinio profesional.",
      "No incluye presentación de escritos ante tribunales.",
      "No incluye seguimiento del expediente.",
      "No garantiza resolución favorable ni eliminación de multas.",
      "El tribunal puede exigir antecedentes o formalidades adicionales.",
    ],
    legalNote:
      "La compra no garantiza que el tribunal declare la prescripción ni que las multas sean eliminadas del Registro de Multas No Pagadas. El producto entrega documentos para tramitación personal.",
  },
  "informe-fecha-estimada-prescripcion": {
    id: "informe-fecha-estimada-prescripcion",
    price: 4990,
    eyebrow: "Informe preventivo",
    title: "Informe de fecha estimada de prescripción",
    description:
      "Compra un informe referencial con las fechas estimadas desde las cuales tus multas podrían cumplir plazo para solicitar prescripción, según los datos visibles en el certificado.",
    priceNote: "Precio único por informe referencial de fechas estimadas.",
    buttonLabel: "Comprar informe de fechas",
    includedItems: [
      "Informe de fecha estimada de prescripción.",
      "Detalle de multas detectadas en el certificado.",
      "Fecha de ingreso al RMNP/RMTNP cuando esté disponible.",
      "Fecha estimada desde la cual podría solicitarse prescripción.",
      "Advertencias legales y criterio de cálculo referencial.",
    ],
    excludedItems: [
      "No incluye instructivo paso a paso.",
      "No incluye escritos ni solicitudes editables.",
      "No incluye representación judicial ni patrocinio profesional.",
      "No incluye presentación ante tribunales ni seguimiento del expediente.",
      "No garantiza que la prescripción sea acogida en el futuro.",
    ],
    legalNote:
      "La fecha indicada es referencial y se calcula según los datos visibles en el certificado. La procedencia de la prescripción depende de la revisión del Juzgado de Policía Local competente y de los antecedentes específicos de cada caso.",
  },
};

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

function normalizeProduct(product: unknown): ProductKind {
  return product === "informe-fecha-estimada-prescripcion"
    ? "informe-fecha-estimada-prescripcion"
    : "informe-completo-prescripcion";
}

export default function ProductDetailModal({
  open,
  onClose,
  quoteToken,
  requestId,
  paymentPayload,
  product,
}: ProductDetailModalProps) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const productKind = normalizeProduct(
    product || getPayloadString(paymentPayload, "product")
  );
  const productConfig = PRODUCT_CONFIG[productKind];

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
      trackPurchaseClicked({
        product: productConfig.id,
        amount: productConfig.price,
        request_id: paymentRequestId || paymentQuoteToken || "",
      });
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
          product: productConfig.id,
          amount: productConfig.price,
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

      trackPaymentRedirect({
        product: productConfig.id,
        amount: productConfig.price,
        request_id: paymentRequestId || paymentQuoteToken || "",
      });

      window.location.href = paymentUrl;
    } catch (err) {
      const rawMessage =
        err instanceof Error
          ? err.message
          : "Error inesperado al iniciar el pago.";

      const friendlyMessage =
        rawMessage === "Load failed" ||
        rawMessage === "Failed to fetch" ||
        rawMessage.toLowerCase().includes("network")
          ? "No se pudo iniciar la compra. Verifica que el certificado haya sido leído correctamente e inténtalo nuevamente."
          : rawMessage;

      setError(friendlyMessage);
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-2xl shadow-emerald-950/20 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          aria-label="Cerrar"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>

        <div className="pr-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Detalle del producto
          </p>

          <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {productConfig.title}
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
            {productConfig.description}
          </p>
        </div>

        <section className="mt-6 rounded-[2rem] border border-emerald-300 bg-slate-950 p-5 text-white shadow-xl shadow-emerald-950/20 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                {productConfig.eyebrow}
              </span>

              <div className="mt-3 flex items-end gap-2">
                <p className="text-5xl font-black tracking-tight text-emerald-300 sm:text-6xl">
                  {formatCLP(productConfig.price)}
                </p>
                <p className="pb-2 text-sm font-black text-emerald-100">CLP</p>
              </div>

              <p className="mt-2 text-xs font-bold leading-6 text-emerald-100/90">
                {productConfig.priceNote}
              </p>
            </div>

            <div className="w-full md:max-w-[250px]">
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{paying ? "Abriendo pago..." : productConfig.buttonLabel}</span>
                <span aria-hidden="true">→</span>
              </button>

              <p className="mt-3 text-center text-xs font-semibold text-emerald-100/80">
                Pago seguro vía Mercado Pago
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-800">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="flex items-center gap-3 text-lg font-black text-emerald-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
                ✓
              </span>
              Qué incluye
            </h3>

            <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-700">
              {productConfig.includedItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-black text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5">
            <h3 className="flex items-center gap-3 text-lg font-black text-teal-950">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-700 text-sm font-black text-teal-800">
                —
              </span>
              Qué no incluye
            </h3>

            <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-700">
              {productConfig.excludedItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-600 text-[11px] font-black text-teal-800">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
          {productConfig.legalNote}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Volver al resultado preliminar
        </button>
      </div>
    </div>
  );
}
