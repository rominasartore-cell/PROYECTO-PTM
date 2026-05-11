"use client";

import PreliminaryResultCard from "@/components/ptm/PreliminaryResultCard";

type ResultsPreliminarySummaryProps = {
  result?: any;
  name?: string | null;
  email?: string | null;
  plate?: string | null;
};

function pick(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeResult(input: any) {
  const source =
    input?.analysisResult ??
    input?.analysis ??
    input?.result ??
    input?.data ??
    input ??
    {};

  return {
    totalMultas: Number(
      pick(
        source.totalMultas,
        source.multasTotalesDetectadas,
        source.resumen?.multasTotalesDetectadas,
        0
      )
    ),
    multasSusceptibles: Number(
      pick(
        source.multasSusceptibles,
        source.multasPotencialmentePrescritas,
        source.resumen?.multasPotencialmentePrescritas,
        0
      )
    ),
    multasDentroPlazo: Number(
      pick(
        source.multasDentroPlazo,
        source.multasVigentes,
        source.resumen?.multasVigentes,
        0
      )
    ),
    multasRevisionManual: Number(
      pick(
        source.multasRevisionManual,
        source.multasPrescritasRevisionManual,
        source.resumen?.multasPrescritasRevisionManual,
        0
      )
    ),
    montoPotencial: Number(
      pick(
        source.montoPotencial,
        source.montoMultasPotencialmentePrescritasCLP,
        source.resumen?.montoPotencial,
        source.resumen?.montoMultasPotencialmentePrescritasCLP,
        0
      )
    ),
    montoPotencialUtm: Number(
      pick(
        source.montoPotencialUtm,
        source.sumaTotalUtmPrescritas,
        source.resumen?.sumaTotalUtmPrescritas,
        0
      )
    ),
    valorUtm: Number(
      pick(
        source.valorUtm,
        source.valorUtmUsado,
        source.utmClp,
        source.resumen?.valorUtmUsado,
        0
      )
    ),
    ahorroTramitacion: Number(
      pick(source.ahorroTramitacion, source.resumen?.ahorroTramitacion, 250000)
    ),
    oportunidadTotalReferencial: Number(
      pick(
        source.oportunidadTotalReferencial,
        source.totalReferencial,
        source.resumen?.oportunidadTotalReferencial,
        0
      )
    ),
    eligible: Boolean(
      pick(
        source.eligible,
        source.esElegible,
        source.multasSusceptibles > 0,
        source.multasPotencialmentePrescritas > 0,
        false
      )
    ),
    logs: Array.isArray(source.logs) ? source.logs : [],
  };
}

export default function ResultsPreliminarySummary({
  result,
  name,
  email,
  plate,
}: ResultsPreliminarySummaryProps) {
  const normalized = normalizeResult(result);

  const paymentPayload = {
    name: name ?? result?.name ?? result?.nombre ?? "",
    email: email ?? result?.email ?? result?.correo ?? "",
    plate: plate ?? result?.plate ?? result?.patente ?? "",
    totalMultas: normalized.totalMultas,
    multasSusceptibles: normalized.multasSusceptibles,
    montoPotencial: normalized.montoPotencial,
    montoPotencialUtm: normalized.montoPotencialUtm,
    valorUtm: normalized.valorUtm,
    analysisResult: normalized,
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PreliminaryResultCard
        result={normalized}
        eligible={normalized.eligible}
        paymentPayload={paymentPayload}
      />
    </section>
  );
}
