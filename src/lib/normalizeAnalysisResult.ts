type AnyRecord = Record<string, any>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value !== "string") return null;

  let cleaned = value.replace(/[^\d,.-]/g, "").trim();

  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    const parsed = toNumber(value);

    if (parsed !== null) return parsed;
  }

  return 0;
}

function normalizeFine(fine: AnyRecord): AnyRecord {
  const isPrescribed =
    fine?.prescripcionPorFecha === true ||
    fine?.estado === "POTENCIALMENTE_PRESCRITA" ||
    fine?.status === "reviewable" ||
    fine?.status === "prescribed" ||
    fine?.status === "potentially_prescribed" ||
    fine?.isReviewable === true ||
    fine?.isPrescribed === true;

  const isManualReview =
    fine?.estado === "REVISION_MANUAL" ||
    fine?.status === "manual_review" ||
    fine?.requiresManualReview === true;

  const montoUtm = toNumber(fine?.montoUtm ?? fine?.amountUtm ?? fine?.utmAmount);
  const montoPesos = toNumber(
    fine?.montoPesos ??
      fine?.amountCLP ??
      fine?.amountClp ??
      fine?.amountPesos ??
      fine?.montoClp
  );

  return {
    ...fine,

    idMulta: fine?.idMulta ?? fine?.id ?? fine?.fineId ?? null,
    fineId: fine?.fineId ?? fine?.idMulta ?? fine?.id ?? null,
    id: fine?.id ?? fine?.idMulta ?? fine?.fineId ?? null,

    fechaIngresoRmnp:
      fine?.fechaIngresoRmnp ??
      fine?.fechaIngresoRmtmp ??
      fine?.entryDate ??
      fine?.rmnpEntryDate ??
      null,

    fechaPrescripcionReferencial:
      fine?.fechaPrescripcionReferencial ?? fine?.prescriptionDate ?? null,

    prescripcionPorFecha: isPrescribed,
    isPrescribed,
    isPotentiallyPrescribed: isPrescribed,
    isReviewable: isPrescribed,
    reviewable: isPrescribed,
    eligible: isPrescribed,
    canPurchase: isPrescribed,

    requiresManualReview: isManualReview,
    isManualReview,

    estado: fine?.estado ?? (isPrescribed ? "POTENCIALMENTE_PRESCRITA" : "VIGENTE"),

    status: isPrescribed
      ? "reviewable"
      : isManualReview
        ? "manual_review"
        : "active",

    frontendStatus: isPrescribed
      ? "reviewable"
      : isManualReview
        ? "manual_review"
        : "active",

    category: isPrescribed
      ? "reviewable"
      : isManualReview
        ? "manual_review"
        : "active",

    montoUtm,
    amountUtm: montoUtm,
    utmAmount: montoUtm,

    montoPesos,
    amountCLP: montoPesos,
    amountClp: montoPesos,
    amountPesos: montoPesos,
    montoClp: montoPesos,
  };
}

export function normalizeAnalysisResult(input: unknown): AnyRecord {
  const raw = asRecord(input);

  const resumen = asRecord(raw.resumen);
  const result = asRecord(raw.result);
  const analysis = asRecord(raw.analysis);
  const analysisResult = asRecord(raw.analysisResult);
  const preliminaryResult = asRecord(raw.preliminaryResult);
  const data = asRecord(raw.data);

  const rawLogs =
    raw.logs ||
    raw.fines ||
    raw.multas ||
    result.logs ||
    result.fines ||
    result.multas ||
    analysis.logs ||
    analysis.fines ||
    analysis.multas ||
    analysisResult.logs ||
    analysisResult.fines ||
    analysisResult.multas ||
    preliminaryResult.logs ||
    preliminaryResult.fines ||
    preliminaryResult.multas ||
    data.logs ||
    data.fines ||
    data.multas ||
    [];

  const logs = Array.isArray(rawLogs)
    ? rawLogs.map((fine: AnyRecord) => normalizeFine(fine))
    : [];

  const reviewableFines = logs.filter(
    (fine: AnyRecord) =>
      fine.isReviewable === true ||
      fine.isPrescribed === true ||
      fine.prescripcionPorFecha === true ||
      fine.estado === "POTENCIALMENTE_PRESCRITA" ||
      fine.status === "reviewable"
  );

  const manualReviewFines = logs.filter(
    (fine: AnyRecord) =>
      fine.requiresManualReview === true ||
      fine.isManualReview === true ||
      fine.estado === "REVISION_MANUAL" ||
      fine.status === "manual_review"
  );

  const multasTotalesDetectadas = firstNumber(
    resumen.multasTotalesDetectadas,
    result.multasTotalesDetectadas,
    analysis.multasTotalesDetectadas,
    analysisResult.multasTotalesDetectadas,
    preliminaryResult.multasTotalesDetectadas,
    data.multasTotalesDetectadas,
    raw.multasTotalesDetectadas,
    raw.totalMultas,
    raw.multasTotales,
    raw.totalFinesDetected,
    raw.finesCount,
    logs.length
  );

  const multasPotencialmentePrescritas = firstNumber(
    resumen.multasPotencialmentePrescritas,
    result.multasPotencialmentePrescritas,
    analysis.multasPotencialmentePrescritas,
    analysisResult.multasPotencialmentePrescritas,
    preliminaryResult.multasPotencialmentePrescritas,
    data.multasPotencialmentePrescritas,
    raw.multasPotencialmentePrescritas,
    raw.multasPrescritas,
    raw.prescribedCount,
    raw.prescribedFinesCount,
    raw.potentiallyPrescribedCount,
    raw.potentialPrescribedCount,
    raw.reviewableCount,
    raw.reviewableFinesCount,
    raw.revisablesCount,
    raw.revisables,
    reviewableFines.length
  );

  const revisionManual = firstNumber(
    resumen.multasPrescritasRevisionManual,
    result.multasPrescritasRevisionManual,
    analysis.multasPrescritasRevisionManual,
    analysisResult.multasPrescritasRevisionManual,
    preliminaryResult.multasPrescritasRevisionManual,
    data.multasPrescritasRevisionManual,
    raw.multasPrescritasRevisionManual,
    raw.manualReviewCount,
    raw.revisionCount,
    raw.revisionManual,
    manualReviewFines.length
  );

  const sumaTotalUtmPrescritas = firstNumber(
    resumen.sumaTotalUtmPrescritas,
    result.sumaTotalUtmPrescritas,
    analysis.sumaTotalUtmPrescritas,
    analysisResult.sumaTotalUtmPrescritas,
    preliminaryResult.sumaTotalUtmPrescritas,
    data.sumaTotalUtmPrescritas,
    raw.sumaTotalUtmPrescritas,
    raw.totalUtmPrescritas,
    raw.totalPrescribedUtm,
    raw.prescribedUtmTotal,
    reviewableFines.reduce((sum: number, fine: AnyRecord) => {
      const monto = toNumber(fine?.montoUtm);
      return sum + (monto ?? 0);
    }, 0)
  );

  const valorUtmUsado = firstNumber(
    resumen.valorUtmUsado,
    result.valorUtmUsado,
    analysis.valorUtmUsado,
    analysisResult.valorUtmUsado,
    preliminaryResult.valorUtmUsado,
    data.valorUtmUsado,
    raw.valorUtmUsado,
    raw.valorUtmClp,
    raw.utmClp,
    raw.currentUtmValue,
    70588
  );

  const montoPotencialPesos = firstNumber(
    resumen.montoPotencialPesos,
    result.montoPotencialPesos,
    analysis.montoPotencialPesos,
    analysisResult.montoPotencialPesos,
    preliminaryResult.montoPotencialPesos,
    data.montoPotencialPesos,
    raw.montoPotencialPesos,
    raw.montoPotencialClp,
    raw.montoTotalPrescrito,
    raw.montoTotalMultasPrescritas,
    raw.totalPotentialAmount,
    raw.potentialAmount,
    raw.potentialSavingsAmount,
    raw.potentialSavings,
    raw.savingsAmount,
    raw.totalSavings,
    Math.round(sumaTotalUtmPrescritas * valorUtmUsado)
  );

  const ahorroReferencialTramitacionPersonalAbogado = firstNumber(
    resumen.ahorroReferencialTramitacionPersonalAbogado,
    result.ahorroReferencialTramitacionPersonalAbogado,
    analysis.ahorroReferencialTramitacionPersonalAbogado,
    analysisResult.ahorroReferencialTramitacionPersonalAbogado,
    preliminaryResult.ahorroReferencialTramitacionPersonalAbogado,
    data.ahorroReferencialTramitacionPersonalAbogado,
    raw.ahorroReferencialTramitacionPersonalAbogado,
    raw.ahorroReferencial,
    raw.lawyerFee,
    raw.attorneyFee,
    raw.honorariosReferenciales,
    250000
  );

  const totalReferencial = firstNumber(
    resumen.totalReferencial,
    result.totalReferencial,
    analysis.totalReferencial,
    analysisResult.totalReferencial,
    preliminaryResult.totalReferencial,
    data.totalReferencial,
    raw.totalReferencial,
    raw.referentialTotal,
    raw.totalWithFees,
    montoPotencialPesos + ahorroReferencialTramitacionPersonalAbogado
  );

  const normalizedCore = {
    multasTotalesDetectadas,
    totalMultas: multasTotalesDetectadas,
    multasTotales: multasTotalesDetectadas,
    totalFines: multasTotalesDetectadas,
    finesTotal: multasTotalesDetectadas,
    totalFinesDetected: multasTotalesDetectadas,
    finesCount: multasTotalesDetectadas,

    multasPotencialmentePrescritas,
    multasPrescritas: multasPotencialmentePrescritas,
    prescribedCount: multasPotencialmentePrescritas,
    prescribedFinesCount: multasPotencialmentePrescritas,
    potentiallyPrescribedCount: multasPotencialmentePrescritas,
    potentialPrescribedCount: multasPotencialmentePrescritas,
    expiredFinesCount: multasPotencialmentePrescritas,
    prescriptionCount: multasPotencialmentePrescritas,

    revisables: multasPotencialmentePrescritas,
    revisablesCount: multasPotencialmentePrescritas,
    reviewable: multasPotencialmentePrescritas,
    reviewableCount: multasPotencialmentePrescritas,
    reviewableFinesCount: multasPotencialmentePrescritas,
    eligibleFinesCount: multasPotencialmentePrescritas,
    eligibleCount: multasPotencialmentePrescritas,

    revision: revisionManual,
    revisionCount: revisionManual,
    revisionManual,
    manualReviewCount: revisionManual,

    sumaTotalUtmPrescritas,
    totalUtmPrescritas: sumaTotalUtmPrescritas,
    totalPrescribedUtm: sumaTotalUtmPrescritas,
    prescribedUtmTotal: sumaTotalUtmPrescritas,
    totalUtm: sumaTotalUtmPrescritas,
    utmTotal: sumaTotalUtmPrescritas,

    valorUtmUsado,
    valorUtmClp: valorUtmUsado,
    utmClp: valorUtmUsado,
    currentUtmValue: valorUtmUsado,
    usedUtmValue: valorUtmUsado,

    montoPotencialPesos,
    montoPotencialClp: montoPotencialPesos,
    montoTotalPrescrito: montoPotencialPesos,
    montoTotalMultasPrescritas: montoPotencialPesos,
    totalPotentialAmount: montoPotencialPesos,
    potentialAmount: montoPotencialPesos,
    amountPotentiallyPrescribed: montoPotencialPesos,
    potentialSavingsAmount: montoPotencialPesos,
    potentialSavings: montoPotencialPesos,
    totalSavings: montoPotencialPesos,
    savingsAmount: montoPotencialPesos,

    ahorroReferencialTramitacionPersonalAbogado,
    ahorroReferencial: ahorroReferencialTramitacionPersonalAbogado,
    lawyerFee: ahorroReferencialTramitacionPersonalAbogado,
    attorneyFee: ahorroReferencialTramitacionPersonalAbogado,
    honorariosReferenciales: ahorroReferencialTramitacionPersonalAbogado,

    totalReferencial,
    referentialTotal: totalReferencial,
    totalWithFees: totalReferencial,

    logs,
    fines: logs,
    multas: logs,
    items: logs,

    reviewableFines,
    revisableFines: reviewableFines,
    multasRevisables: reviewableFines,
    eligibleFines: reviewableFines,

    manualReviewFines,
    revisionFines: manualReviewFines,

    hasReviewableFines: multasPotencialmentePrescritas > 0,
    hasPrescribedFines: multasPotencialmentePrescritas > 0,
    canPurchase: multasPotencialmentePrescritas > 0,
    eligibleForPurchase: multasPotencialmentePrescritas > 0,
  };

  return {
    ...raw,
    ...normalizedCore,

    resumen: {
      ...resumen,
      ...normalizedCore,
    },

    result: {
      ...result,
      ...normalizedCore,
    },

    analysis: {
      ...analysis,
      ...normalizedCore,
    },

    analysisResult: {
      ...analysisResult,
      ...normalizedCore,
    },

    preliminaryResult: {
      ...preliminaryResult,
      ...normalizedCore,
    },

    data: {
      ...data,
      ...normalizedCore,
    },
  };
}
