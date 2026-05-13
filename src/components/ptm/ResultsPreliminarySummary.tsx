"use client";

import PreliminaryResultCard from "@/components/ptm/PreliminaryResultCard";

type ResultsPreliminarySummaryProps = {
  result?: any;
  name?: string | null;
  email?: string | null;
  plate?: string | null;
};

function pick(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

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
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function booleanFrom(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "si", "sí", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }
  return null;
}

function normalizeResult(input: any) {
  const source =
    input?.analysisResult ??
    input?.analysis ??
    input?.result ??
    input?.data ??
    input ??
    {};

  const resumen = source?.resumen ?? {};
  const multas =
    source.multas ??
    source.fines ??
    source.items ??
    source.detalleMultas ??
    source.multasDetectadas ??
    [];

  const totalMultas = numberFrom(
    pick(
      source.totalMultas,
      source.multasTotalesDetectadas,
      source.totalFines,
      resumen.totalMultas,
      resumen.multasTotalesDetectadas,
      Array.isArray(multas) ? multas.length : 0
    )
  );

  const multasSusceptibles = numberFrom(
    pick(
      source.multasSusceptibles,
      source.multasPotencialmentePrescritas,
      source.potentiallyPrescribedCount,
      source.prescribedCount,
      resumen.multasSusceptibles,
      resumen.multasPotencialmentePrescritas,
      0
    )
  );

  const montoPotencialUtm = numberFrom(
    pick(
      source.montoPotencialUtm,
      source.sumaTotalUtmPrescritas,
      source.totalUtmPrescritas,
      resumen.montoPotencialUtm,
      resumen.sumaTotalUtmPrescritas,
      resumen.totalUtmPrescritas,
      0
    )
  );

  const valorUtm = numberFrom(
    pick(
      source.valorUtm,
      source.valorUtmUsado,
      source.utmClp,
      resumen.valorUtm,
      resumen.valorUtmUsado,
      resumen.utmClp,
      0,
      0
    )
  );

  const montoPotencialBackend = numberFrom(
    pick(
      source.montoPotencial,
      source.montoMultasPotencialmentePrescritasCLP,
      source.montoPrescritoCLP,
      resumen.montoPotencial,
      resumen.montoMultasPotencialmentePrescritasCLP,
      resumen.montoPrescritoCLP,
      0
    )
  );

  const montoPotencial =
    montoPotencialBackend > 0
      ? montoPotencialBackend
      : montoPotencialUtm > 0 && valorUtm > 0
        ? montoPotencialUtm * valorUtm
        : 0;

  const ahorroTramitacion = numberFrom(
    pick(source.ahorroTramitacion, resumen.ahorroTramitacion, 250000)
  );

  const oportunidadTotalBackend = numberFrom(
    pick(
      source.oportunidadTotalReferencial,
      source.totalReferencial,
      resumen.oportunidadTotalReferencial,
      resumen.totalReferencial,
      0
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

  const explicitEligible = booleanFrom(pick(source.eligible, source.esElegible, resumen.eligible));
  const eligible = explicitEligible ?? multasSusceptibles > 0;

  return {
    totalMultas,
    multasSusceptibles,
    multasDentroPlazo: numberFrom(
      pick(source.multasDentroPlazo, source.multasVigentes, resumen.multasVigentes, 0)
    ),
    multasRevisionManual: numberFrom(
      pick(
        source.multasRevisionManual,
        source.multasPrescritasRevisionManual,
        resumen.multasPrescritasRevisionManual,
        0
      )
    ),
    montoPotencial,
    montoPotencialUtm,
    valorUtm,
    ahorroTramitacion,
    oportunidadTotalReferencial:
      oportunidadTotalBackend > 0 ? oportunidadTotalBackend : montoPotencial + ahorroTramitacion,
    eligible,
    requestId,
    quoteToken,
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

  const source =
    result?.analysisResult ??
    result?.analysis ??
    result?.result ??
    result?.data ??
    result ??
    {};

  const finalName = textFrom(pick(name, source.name, source.nombre, source.customerName));
  const finalEmail = textFrom(pick(email, source.email, source.correo, source.customerEmail));
  const finalPlate = textFrom(pick(plate, source.plate, source.patente, source.vehiclePlate));

  const paymentPayload = {
    requestId: normalized.requestId,
    quoteToken: normalized.quoteToken,
    name: finalName,
    email: finalEmail,
    plate: finalPlate,
    customerName: finalName,
    customerEmail: finalEmail,
    vehiclePlate: finalPlate,
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
        quoteToken={normalized.quoteToken}
        requestId={normalized.requestId}
        eligible={normalized.eligible}
        paymentPayload={paymentPayload}
      />
    </section>
  );
}
