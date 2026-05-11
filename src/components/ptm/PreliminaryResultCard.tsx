"use client";

import { useMemo, useState } from "react";
import ProductDetailModal from "./ProductDetailModal";

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
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function pick(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeAnalysis(input: any) {
  const source = input?.result ?? input?.analysis ?? input?.data ?? input ?? {};

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

  const prescribedCount = numberFrom(
    pick(
      source.multasSusceptibles,
      source.multasPotencialmentePrescritas,
      source.potentiallyPrescribedCount,
      source.prescribedCount,
      source.resumen?.multasSusceptibles,
      source.resumen?.multasPotencialmentePrescritas,
      source.resumen?.prescritas,
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
      source.resumen?.montoPotencial,
      source.resumen?.montoMultasPotencialmentePrescritasCLP,
      source.resumen?.montoPrescritoCLP
    )
  );

  const totalUtm = numberFrom(
    pick(
      source.montoPotencialUtm,
      source.totalUtmPrescritas,
      source.sumaUtmPrescritas,
      source.resumen?.montoPotencialUtm,
      source.resumen?.totalUtmPrescritas,
      source.resumen?.sumaUtmPrescritas,
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
      source.utmClp,
      source.UTM_CLP,
      source.resumen?.valorUtm,
      source.resumen?.utmClp,
      process.env.NEXT_PUBLIC_UTM_CLP
    )
  );

  const amount =
    amountFromBackend > 0
      ? amountFromBackend
      : totalUtm > 0 && utmClp > 0
        ? totalUtm * utmClp
        : 0;

  const lawyerEstimate = numberFrom(
    pick(source.ahorroTramitacion, source.resumen?.ahorroTramitacion, DEFAULT_LAWYER_ESTIMATE_CLP)
  );

  const totalReferential = numberFrom(
    pick(
      source.oportunidadTotalReferencial,
      source.totalReferencial,
      source.resumen?.oportunidadTotalReferencial,
      source.resumen?.totalReferencial
    )
  );

  const requestId = String(
    pick(source.requestId, source.solicitudId, source.id, source.quote?.requestId, "") ?? ""
  );

  const quoteToken = String(
    pick(source.quoteToken, source.token, source.quote?.quoteToken, requestId, "") ?? ""
  );

  return {
    prescribedCount,
    amount,
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

  const normalized = useMemo(
    () => normalizeAnalysis(result ?? analysis),
    [analysis, result]
  );

  const canPurchase =
    typeof eligible === "boolean"
      ? eligible
      : normalized.prescribedCount > 0 && normalized.amount > 0;

  const finalQuoteToken = quoteToken ?? normalized.quoteToken;
  const finalRequestId = requestId ?? normalized.requestId;

  return (
    <>
      <article className="mx-auto mt-6 w-full max-w-[760px] overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200">
        <header className="bg-gradient-to-br from-emerald-600 via-cyan-700 to-blue-700 px-7 py-9 text-white sm:px-10">
          <p className="mb-6 flex items-center gap-3 text-sm font-black tracking-[0.18em] text-white/90">
            <span className="text-2xl">✓</span>
            RESULTADO PRELIMINAR
          </p>

          <h2 className="max-w-xl text-4xl font-black leading-tight sm:text-5xl">
            Se detectaron multas ingresadas al RMNP
          </h2>

          <p className="mt-7 max-w-md text-xl leading-snug text-white/90 sm:text-2xl">
            El análisis preliminar detectó que tu certificado registra:
          </p>
        </header>

        <div className="space-y-5 px-6 py-7 sm:px-9 sm:py-9">
          <section className="relative rounded-3xl border border-emerald-200 bg-emerald-50/30 px-5 pb-7 pt-16 text-center">
            <div className="absolute left-1/2 top-0 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-lime-500 to-emerald-600 text-4xl text-white shadow-xl">
              ▣
            </div>

            <p className="text-xl font-black tracking-wide text-emerald-700 sm:text-2xl">
              MULTAS POTENCIALMENTE PRESCRITAS
            </p>

            <div className="mt-2 flex items-center justify-center gap-5">
              <span className="h-px w-28 bg-emerald-200" />
              <p className="text-7xl font-black leading-none text-emerald-600 sm:text-8xl">
                {normalized.prescribedCount}
              </p>
              <span className="h-px w-28 bg-emerald-200" />
            </div>
          </section>

          <section className="relative rounded-3xl border border-cyan-200 bg-cyan-50 px-5 pb-7 pt-16 text-center">
            <div className="absolute left-1/2 top-0 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-600 text-5xl font-black text-white shadow-xl">
              $
            </div>

            <p className="mx-auto max-w-md text-xl font-black leading-tight tracking-wide text-teal-800 sm:text-2xl">
              MONTO ASOCIADO A LAS MULTAS POTENCIALMENTE PRESCRITAS
            </p>

            <p className="mt-5 text-5xl font-black leading-none tracking-tight text-teal-700 sm:text-7xl">
              {formatCLP(normalized.amount)}
            </p>

            <p className="mx-auto mt-5 max-w-md text-lg font-medium leading-tight text-slate-600 sm:text-xl">
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

          <section className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-5xl">
              🛡️
            </div>
            <p className="text-xl font-medium leading-snug text-slate-700">
              Compra tu informe completo, tramita personalmente la prescripción y
              podrías ahorrarte{" "}
              <strong className="font-black text-emerald-700">
                hasta {formatCLP(normalized.totalReferential)}.
              </strong>
            </p>
          </section>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!canPurchase}
            className="w-full rounded-2xl bg-emerald-600 px-6 py-5 text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {canPurchase ? "Comprar informe completo →" : "Compra no disponible"}
          </button>

          <a
            href="https://www.registrocivil.cl/principal/servicios-en-linea/certificado-de-multas-de-transito-no-pagadas"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-2xl border-2 border-blue-600 px-6 py-4 text-center text-xl font-black text-blue-700 transition hover:bg-blue-50"
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
        paymentPayload={paymentPayload}
      />
    </>
  );
}
