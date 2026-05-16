"use client";

import { useMemo, useState } from "react";
import ProductDetailModal from "./ProductDetailModal";

type ProductKind =
  | "informe-completo-prescripcion"
  | "informe-fecha-estimada-prescripcion";

type PreliminaryResultCardProps = {
  analysis?: any;
  result?: any;
  quoteToken?: string | null;
  requestId?: string | null;
  eligible?: boolean;
  paymentPayload?: Record<string, unknown>;
};

const DEFAULT_LAWYER_ESTIMATE_CLP = 250000;

function numberFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function textFrom(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function pick(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeAnalysis(input: any) {
  const source = input?.result ?? input?.analysis ?? input?.analysisResult ?? input?.data ?? input ?? {};
  const resumen = source?.resumen ?? {};

  const multas =
    source.multas ??
    source.fines ??
    source.items ??
    source.detalleMultas ??
    source.multasDetectadas ??
    [];

  const potentiallyPrescribedList = Array.isArray(multas)
    ? multas.filter((m: any) => {
        const status = String(
          m?.estado ??
            m?.status ??
            m?.prescriptionStatus ??
            m?.situacion ??
            ""
        ).toLowerCase();

        return (
          m?.potencialmentePrescrita === true ||
          m?.isPrescribed === true ||
          m?.prescrita === true ||
          status.includes("prescrit")
        );
      })
    : [];

  const totalCount = numberFrom(
    pick(
      source.totalMultas,
      source.multasTotalesDetectadas,
      source.totalFines,
      source.finesCount,
      source.totalTickets,
      resumen.totalMultas,
      resumen.multasTotalesDetectadas,
      resumen.totalFines,
      Array.isArray(multas) ? multas.length : 0
    )
  );

  const prescribedCount = numberFrom(
    pick(
      source.multasSusceptibles,
      source.multasPotencialmentePrescritas,
      source.potentiallyPrescribedCount,
      source.prescribedCount,
      resumen.multasSusceptibles,
      resumen.multasPotencialmentePrescritas,
      resumen.prescritas,
      potentiallyPrescribedList.length
    )
  );

  const amountFromBackend = numberFrom(
    pick(
      source.montoPotencial,
      source.montoMultasPotencialmentePrescritasCLP,
      source.montoAsociadoMultasPrescritas,
      source.montoPrescritoCLP,
      source.potentialSavingsCLP,
      resumen.montoPotencial,
      resumen.montoMultasPotencialmentePrescritasCLP,
      resumen.montoPrescritoCLP
    )
  );

  const totalUtm = numberFrom(
    pick(
      source.montoPotencialUtm,
      source.totalUtmPrescritas,
      source.sumaUtmPrescritas,
      source.sumaTotalUtmPrescritas,
      resumen.montoPotencialUtm,
      resumen.totalUtmPrescritas,
      resumen.sumaUtmPrescritas,
      resumen.sumaTotalUtmPrescritas,
      Array.isArray(potentiallyPrescribedList)
        ? potentiallyPrescribedList.reduce((acc: number, m: any) => {
            return acc + numberFrom(pick(m?.montoUtm, m?.utm, m?.montoMultaUtm));
          }, 0)
        : 0
    )
  );

  const utmClp = numberFrom(
    pick(
      source.valorUtm,
      source.valorUtmUsado,
      source.utmClp,
      source.UTM_CLP,
      resumen.valorUtm,
      resumen.valorUtmUsado,
      resumen.utmClp,
      0
    )
  );

  const amount =
    amountFromBackend > 0
      ? amountFromBackend
      : totalUtm > 0 && utmClp > 0
        ? totalUtm * utmClp
        : 0;

  const lawyerEstimate = numberFrom(
    pick(source.ahorroTramitacion, resumen.ahorroTramitacion, DEFAULT_LAWYER_ESTIMATE_CLP)
  );

  const totalReferential = numberFrom(
    pick(
      source.oportunidadTotalReferencial,
      source.totalReferencial,
      resumen.oportunidadTotalReferencial,
      resumen.totalReferencial
    )
  );

  const requestId = textFrom(
    pick(
      source.requestId,
      source.request_id,
      source.solicitudId,
      source.id,
      source.quote?.requestId,
      source.quote?.request_id
    )
  );

  const quoteToken = textFrom(
    pick(source.quoteToken, source.quote_token, source.token, source.quote?.quoteToken, requestId)
  );

  return {
    totalCount,
    prescribedCount,
    amount,
    totalUtm,
    utmClp,
    lawyerEstimate,
    totalReferential: totalReferential > 0 ? totalReferential : amount + lawyerEstimate,
    requestId,
    quoteToken,
  };
}

export default function PreliminaryResultCard({
  analysis,
  result,
  quoteToken,
  requestId,
  eligible,
  paymentPayload,
}: PreliminaryResultCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<ProductKind>(
    "informe-completo-prescripcion"
  );

  const normalized = useMemo(
    () => normalizeAnalysis(result ?? analysis),
    [analysis, result]
  );

  const finalQuoteToken = quoteToken || normalized.quoteToken;
  const finalRequestId = requestId || normalized.requestId;

  const hasPaymentReference = Boolean(finalRequestId || finalQuoteToken);
  const hasDetectedFines = normalized.totalCount > 0;
  const hasEligibleFines = normalized.prescribedCount > 0;

  const canPurchaseFull =
    hasPaymentReference &&
    hasEligibleFines &&
    (typeof eligible === "boolean" ? eligible : true);

  const canPurchaseEstimated =
    hasPaymentReference &&
    hasDetectedFines &&
    !hasEligibleFines;

  function openProduct(product: ProductKind) {
    setModalProduct(product);
    setModalOpen(true);
  }

  const modalPayload = useMemo(
    () => ({
      ...(paymentPayload ?? {}),
      requestId: finalRequestId,
      quoteToken: finalQuoteToken,
      product: modalProduct,
      totalMultas: normalized.totalCount,
      totalFines: normalized.totalCount,
      total_multas: normalized.totalCount,
      total_fines: normalized.totalCount,
      multasSusceptibles: normalized.prescribedCount,
      multas_susceptibles: normalized.prescribedCount,
      prescribedCount: normalized.prescribedCount,
      prescribed_count: normalized.prescribedCount,
      potentiallyPrescribed: normalized.prescribedCount,
      potentially_prescribed: normalized.prescribedCount,
      totalPotentiallyPrescribed: normalized.prescribedCount,
      total_potentially_prescribed: normalized.prescribedCount,
      montoPotencial: normalized.amount,
      monto_potencial: normalized.amount,
      potentialAmount: normalized.amount,
      potential_amount: normalized.amount,
      prescribedAmount: normalized.amount,
      prescribed_amount: normalized.amount,
      montoPotencialUtm: normalized.totalUtm,
      monto_potencial_utm: normalized.totalUtm,
      totalUtm: normalized.totalUtm,
      total_utm: normalized.totalUtm,
      valorUtm: normalized.utmClp,
      valor_utm: normalized.utmClp,
      utmClp: normalized.utmClp,
      utm_clp: normalized.utmClp,
    }),
    [paymentPayload, finalRequestId, finalQuoteToken, modalProduct, normalized]
  );

  return (
    <>
      <article className="mx-auto mt-6 w-full max-w-[760px] overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
        <header className="bg-gradient-to-br from-emerald-600 via-cyan-700 to-slate-700 px-7 py-9 text-white sm:px-10">
          <p className="mb-6 flex items-center gap-3 text-sm font-black tracking-[0.18em] text-white/90">
            <span className="text-2xl" aria-hidden="true">✓</span>
            RESULTADO PRELIMINAR
          </p>

          <h2 className="max-w-xl text-3xl font-black leading-tight sm:text-3xl">
            Se detectaron multas ingresadas al RMNP
          </h2>

          <p className="mt-7 max-w-md text-xl leading-snug text-white/90 sm:text-2xl">
            El análisis preliminar detectó que tu certificado registra:
          </p>
        </header>

        <div className="space-y-5 px-6 py-7 sm:px-9 sm:py-9">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-slate-700">
                Multas detectadas
              </p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {normalized.totalCount}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
                Potencialmente prescritas
              </p>
              <p className="mt-3 text-3xl font-black text-emerald-700">
                {normalized.prescribedCount}
              </p>
            </div>
          </section>

          <section className="relative rounded-3xl border border-cyan-200 bg-cyan-50 px-5 pb-7 pt-16 text-center">
            <div className="absolute left-1/2 top-0 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-600 text-3xl font-black text-white shadow-lg">
              $
            </div>

            <p className="mx-auto max-w-md text-xl font-black leading-tight tracking-wide text-teal-800 sm:text-2xl">
              MONTO ASOCIADO A LAS MULTAS POTENCIALMENTE PRESCRITAS
            </p>

            <p className="mt-5 text-3xl font-black leading-none tracking-tight text-teal-700 sm:text-7xl">
              {formatCLP(normalized.amount)}
            </p>

            <p className="mx-auto mt-5 max-w-md text-lg font-medium leading-tight text-slate-700 sm:text-xl">
              Monto referencial calculado en base al certificado subido.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 text-lg text-slate-700">
              <p className="max-w-[230px] leading-tight">
                Tramitación por abogado estimada
              </p>
              <p className="font-black text-slate-900">
                {formatCLP(normalized.lawyerEstimate)}
              </p>
            </div>

            <div className="my-5 h-px bg-slate-200" />

            <div className="flex items-center justify-between gap-4 text-xl">
              <p className="font-black text-slate-950">Total referencial</p>
              <p className="font-black text-slate-950">
                {formatCLP(normalized.totalReferential)}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm font-semibold leading-6 text-teal-950">
            <p className="font-black">Importante</p>
            <p className="mt-2">
              El resultado es preliminar y referencial. La prescripción debe solicitarse ante el tribunal competente y la eliminación del RMNP depende de la resolución respectiva.
            </p>
          </section>

          <div className="space-y-3">
            {canPurchaseFull ? (
              <button
                type="button"
                onClick={() => openProduct("informe-completo-prescripcion")}
                className="w-full rounded-2xl bg-emerald-700 px-6 py-5 text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0"
              >
                Comprar informe completo →
              </button>
            ) : null}

            {canPurchaseEstimated ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Sin multas prescritas todavía
                </p>

                <h3 className="mt-2 text-xl font-black leading-tight text-slate-950">
                  ¿Quieres saber cuándo podrían prescribir?
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                  Podemos generar un informe con la fecha estimada desde la cual podrías solicitar la prescripción de cada multa detectada, según los datos visibles en el certificado.
                </p>

                <p className="mt-3 text-xs font-bold leading-5 text-amber-800">
                  Disponible solo porque el sistema detectó multas en el certificado. Si el certificado no se leyó bien o no contiene multas, esta compra queda bloqueada.
                </p>

                <button
                  type="button"
                  onClick={() => openProduct("informe-fecha-estimada-prescripcion")}
                  className="mt-4 w-full rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
                >
                  Comprar informe de fechas estimadas - $4.990 →
                </button>
              </section>
            ) : null}

            {!canPurchaseFull && !canPurchaseEstimated ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold leading-5 text-amber-800">
                Compra no disponible. Debe existir una solicitud válida y el certificado debe tener multas detectadas.
              </p>
            ) : null}
          </div>

          <a
            href="https://www.registrocivil.cl/principal/servicios-en-linea/certificado-de-multas-de-tránsito-no-pagadas"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-2xl border-2 border-emerald-600 px-5 py-3 text-center text-xl font-black text-teal-700 transition hover:bg-emerald-50"
          >
            Obtener certificado ↗
          </a>
        </div>
      </article>

      <ProductDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        quoteToken={finalQuoteToken}
        requestId={finalRequestId}
        paymentPayload={modalPayload}
        product={modalProduct}
      />
    </>
  );
}
