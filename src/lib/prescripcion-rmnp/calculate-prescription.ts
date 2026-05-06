import { Fine, PrescriptionStatus, AnalysisSummary } from './types';

const PRESCRIPTION_YEARS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = MS_PER_DAY * 365.25;

export function calculatePrescription(fine: Fine, currentDate: Date = new Date()): Fine {
  const result = { ...fine };

  // Si no hay fecha de ingreso RMNP, no se puede calcular
  if (!result.rmnpEntryDate) {
    result.prescriptionStatus = 'REQUIERE_REVISION';
    result.reason =
      'No se encontró Fecha Ingreso RMNP. Requiere revisión manual.';
    result.confidence = 'BAJA';
    result.yearsElapsed = null;
    result.daysElapsed = null;
    return result;
  }

  // Parsear fecha
  const [year, month, day] = result.rmnpEntryDate.split('-');
  let entryDate: Date;

  try {
    entryDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (isNaN(entryDate.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (e) {
    result.prescriptionStatus = 'REQUIERE_REVISION';
    result.reason = 'Fecha Ingreso RMNP no válida. Requiere revisión manual.';
    result.confidence = 'BAJA';
    return result;
  }

  // Calcular diferencia
  const diffMs = currentDate.getTime() - entryDate.getTime();
  const daysElapsed = Math.floor(diffMs / MS_PER_DAY);
  const yearsElapsed = daysElapsed / 365.25;

  result.daysElapsed = daysElapsed;
  result.yearsElapsed = Math.round(yearsElapsed * 100) / 100;

  // Aplicar criterio: 3 años o más = prescrita
  if (yearsElapsed >= PRESCRIPTION_YEARS) {
    result.prescriptionStatus = 'PRESCRITA';
    result.reason = `Han transcurrido ${result.yearsElapsed.toFixed(2)} años desde el ingreso a RMNP. Criterio: 3 años o más.`;
    result.confidence = 'ALTA';
  } else {
    result.prescriptionStatus = 'NO_PRESCRITA';
    result.reason = `Han transcurrido ${result.yearsElapsed.toFixed(2)} años desde el ingreso a RMNP. No alcanza el límite de 3 años.`;
    result.confidence = 'ALTA';
  }

  return result;
}

export function calculateBatchPrescription(
  fines: Fine[],
  currentDate: Date = new Date()
): Fine[] {
  return fines.map(fine => calculatePrescription(fine, currentDate));
}

// Alias para compatibilidad con código existente
export const enrichFinesWithPrescription = calculateBatchPrescription;

// Alias para compatibilidad - usar AnalysisSummary de types.ts
export type FineSummary = AnalysisSummary;

export function calculateSummary(fines: Fine[]): AnalysisSummary {
  const courts = new Set<string>();
  let prescribedAmount = 0;
  let totalAmount = 0;

  const summary: FineSummary = {
    totalFines: fines.length,
    prescribedCount: 0,
    notPrescribedCount: 0,
    reviewCount: 0,
    tagFines: 0,
    nonTagFines: 0,
    totalAmount: null,
    prescribedAmount: null,
    oldestRmnpEntryDate: null,
    newestRmnpEntryDate: null,
    missingRmnpEntryDateCount: 0,
    courts: [],
  };

  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;

  for (const fine of fines) {
    // Contar por estado de prescripción
    if (fine.prescriptionStatus === 'PRESCRITA') {
      summary.prescribedCount++;
      prescribedAmount += fine.arancelAmount || 0;
    } else if (fine.prescriptionStatus === 'NO_PRESCRITA') {
      summary.notPrescribedCount++;
    } else {
      summary.reviewCount++;
    }

    // Contar por TAG
    if (fine.isTagFine) {
      summary.tagFines++;
    } else {
      summary.nonTagFines++;
    }

    // Sumar montos
    totalAmount += fine.arancelAmount || 0;

    // Coleccionar juzgados
    if (fine.court) {
      courts.add(fine.court);
    }

    // Rastrear fechas
    if (fine.rmnpEntryDate) {
      const [year, month, day] = fine.rmnpEntryDate.split('-');
      const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

      if (!isNaN(date.getTime())) {
        if (!oldestDate || date < oldestDate) {
          oldestDate = date;
        }
        if (!newestDate || date > newestDate) {
          newestDate = date;
        }
      }
    } else {
      summary.missingRmnpEntryDateCount++;
    }
  }

  summary.totalAmount = totalAmount;
  summary.prescribedAmount = prescribedAmount;
  summary.courts = Array.from(courts).sort();
  summary.oldestRmnpEntryDate = oldestDate ? oldestDate.toISOString().split('T')[0] : null;
  summary.newestRmnpEntryDate = newestDate ? newestDate.toISOString().split('T')[0] : null;

  return summary;
}
