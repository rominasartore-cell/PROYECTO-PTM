export * from './types';
export * from './extract-text';
export * from './normalize';
export * from './parse-certificate';
export * from './calculate-prescription';
export * from './test-data';

import { AnalysisResult, Fine } from './types';

export function buildFreeSummary(analysis: AnalysisResult) {
  return {
    requestId: analysis.requestId,
    vehiclePlate: analysis.certificate.vehiclePlateNormalized,
    totalFines: analysis.summary.totalFines,
    prescribedCount: analysis.summary.prescribedCount,
    notPrescribedCount: analysis.summary.notPrescribedCount,
    reviewCount: analysis.summary.reviewCount,
    totalAmount: analysis.summary.totalAmount,
    prescribedAmount: analysis.summary.prescribedAmount,
    hasPotentialPrescription: analysis.summary.prescribedCount > 0,
    message: analysis.summary.prescribedCount > 0
      ? `Detectamos ${analysis.summary.prescribedCount} multa(s) que podrían estar prescrita(s).`
      : 'No se detectaron multas potencialmente prescritas en tu certificado.',
    extractedAt: analysis.extractedAt,
    warnings: analysis.warnings,
    courts: analysis.summary.courts,
  };
}

export function prepareAiInputForPaidReport(analysis: AnalysisResult) {
  // Preparar solo datos necesarios, sin información sensible completa
  return {
    requestId: analysis.requestId,
    vehiclePlateNormalized: analysis.certificate.vehiclePlateNormalized,
    folio: analysis.certificate.folio,
    issueDate: analysis.certificate.issueDate,
    fines: analysis.fines.map(f => ({
      id: f.id,
      rol: f.rol,
      rolYear: f.rolYear,
      court: f.court,
      infraction: f.infraction,
      infractionDate: f.infractionDate,
      sentenceDate: f.sentenceDate,
      rmnpEntryDate: f.rmnpEntryDate,
      prescriptionStatus: f.prescriptionStatus,
      yearsElapsed: f.yearsElapsed,
      daysElapsed: f.daysElapsed,
      reason: f.reason,
      fineAmountRaw: f.fineAmountRaw,
      arancelAmount: f.arancelAmount,
      isTagFine: f.isTagFine,
    })),
    summary: analysis.summary,
  };
}
