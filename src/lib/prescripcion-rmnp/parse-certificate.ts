import {
  Fine,
  CertificateHeader,
  AnalysisSummary,
  AnalysisResult,
} from './types';
import {
  normalizeDate,
  parseUtmAmount,
  parseClpLikeAmount,
  normalizePlate,
  normalizeCourtName,
  normalizeCertificateText,
} from './normalize';
import { calculatePrescription } from './calculate-prescription';

export function parseCertificateHeader(text: string): CertificateHeader {
  const header: CertificateHeader = {
    folio: null,
    verificationCode: null,
    certificateType: null,
    vehiclePlateRaw: null,
    vehiclePlateNormalized: null,
    issueDate: null,
    ownerName: null,
    ownerRun: null,
    acquisitionDate: null,
    pagesDetected: null,
  };

  // Folio
  let match = text.match(/FOLIO\s*:\s*(\d+)/i);
  if (match) header.folio = match[1];

  // Verification code
  match = text.match(/Código\s+Verificación\s*:\s*([a-f0-9]+)/i);
  if (match) header.verificationCode = match[1];

  // Certificate type
  match = text.match(
    /(Certificado de Registro de Multas de Tránsito No Pagadas)/i
  );
  if (match) header.certificateType = match[1];

  // Vehicle plate
  match = text.match(/VEHICULO\s+PLACA\s+PATENTE\s+UNICA\s*:\s*(.+?)(?:\n|$)/i);
  if (match) {
    header.vehiclePlateRaw = match[1].trim();
    header.vehiclePlateNormalized = normalizePlate(match[1]);
  }

  // Issue date
  match = text.match(/FECHA\s+EMISIÓN\s*:\s*(.+?)(?:\n|$)/i);
  if (match) header.issueDate = normalizeDate(match[1]);

  // Owner info
  match = text.match(/(?:Nombre|NOMBRE)\s*:\s*(.+?)(?:\n|$)/i);
  if (match) header.ownerName = match[1].trim();

  match = text.match(/(?:R\.U\.N\.|RUT|RUN)\s*:\s*(.+?)(?:\n|$)/i);
  if (match) header.ownerRun = match[1].trim();

  match = text.match(/(?:Fec\.\s+adquisición|FECHA ADQUISICIÓN)\s*:\s*(.+?)(?:\n|$)/i);
  if (match) header.acquisitionDate = normalizeDate(match[1]);

  return header;
}

export function splitFineBlocks(text: string): string[] {
  // Dividir por "ID MULTA :"
  const blocks = text.split(/ID\s+MULTA\s*:/i);

  // El primer elemento es el header, descartarlo
  // Reconstruir con el prefijo para cada bloque
  return blocks
    .slice(1)
    .map(block => 'ID MULTA :' + block)
    .filter(block => block.length > 50); // Filtrar bloques muy cortos
}

export function parseFineBlock(block: string): Fine {
  const fine: Fine = {
    id: '',
    rol: null,
    rolYear: null,
    court: null,
    municipality: null,
    infraction: null,
    infractionDate: null,
    sentenceDate: null,
    plate: null,
    fineAmountRaw: null,
    fineAmountUtm: null,
    arancelRaw: null,
    arancelAmount: null,
    isTagFine: null,
    rmnpReportDate: null,
    rmnpEntryDate: null,
    rmnpEntryDateTimeRaw: null,
    prescriptionStatus: 'REQUIERE_REVISION',
    yearsElapsed: null,
    daysElapsed: null,
    reason: 'Sin calcular',
    confidence: 'BAJA',
    sourceBlock: block,
  };

  // ID MULTA
  let match = block.match(/ID\s+MULTA\s*:\s*(\d+)/i);
  if (match) fine.id = match[1];

  // INFRACCION (puede ser multilínea)
  match = block.match(/INFRACCION\s*:\s*(.+?)(?=\n[A-Z]+\s*:|$)/is);
  if (match) {
    fine.infraction = match[1]
      .replace(/\n\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  // TRIBUNAL
  match = block.match(/TRIBUNAL\s*:\s*(.+?)(?:\n|$)/i);
  if (match) {
    fine.court = normalizeCourtName(match[1]);
  }

  // ROL and AÑO ROL
  match = block.match(/ROL\s*:\s*(\d+|[A-Z]\d+[A-Z]*)\s+AÑO\s+ROL\s*:\s*(\d+)/i);
  if (match) {
    fine.rol = match[1];
    fine.rolYear = match[2];
  }

  // FECHA INFRACCION
  match = block.match(/FECHA\s+INFRACCION\s*:\s*(.+?)(?:\n|$)/i);
  if (match) fine.infractionDate = normalizeDate(match[1]);

  // FECHA SENTENCIA
  match = block.match(/FECHA\s+SENTENCIA\s*:\s*(.+?)(?:\n|$)/i);
  if (match) fine.sentenceDate = normalizeDate(match[1]);

  // MONTO MULTA-MONEDA (UTM)
  match = block.match(/MONTO\s+MULTA[\-\s]*MONEDA\s*:\s*(.+?)(?:\n|$)/i);
  if (match) {
    fine.fineAmountRaw = match[1].trim();
    fine.fineAmountUtm = parseUtmAmount(match[1]);
  }

  // ARANCEL
  match = block.match(/ARANCEL\s*:\s*(.+?)(?:\n|$)/i);
  if (match) {
    fine.arancelRaw = match[1].trim();
    fine.arancelAmount = parseClpLikeAmount(match[1]);
  }

  // MULTA TIPO TAG
  match = block.match(/MULTA\s+TIPO\s+TAG\s*:\s*(\d+)/i);
  if (match) fine.isTagFine = parseInt(match[1]) === 1;

  // FECHA INFORME RMNP
  match = block.match(/FECHA\s+INFORME\s+RMNP\s*:\s*(.+?)(?:\n|$)/i);
  if (match) fine.rmnpReportDate = normalizeDate(match[1]);

  // FECHA INGRESO RMNP (pueden ser varias variantes)
  match = block.match(
    /FECHA\s+INGRESO\s+(?:AL\s+)?R(?:EGISTRO|MNP|MNPST)?\s*:\s*(.+?)(?:\n|$)/i
  );
  if (match) {
    fine.rmnpEntryDateTimeRaw = match[1].trim();
    fine.rmnpEntryDate = normalizeDate(match[1]);
  }

  return fine;
}

export function buildFineSummary(fines: Fine[]): AnalysisSummary {
  const summary: AnalysisSummary = {
    totalFines: fines.length,
    prescribedCount: 0,
    notPrescribedCount: 0,
    reviewCount: 0,
    totalAmount: null,
    prescribedAmount: null,
    tagFines: 0,
    nonTagFines: 0,
    courts: [],
    oldestRmnpEntryDate: null,
    newestRmnpEntryDate: null,
    missingRmnpEntryDateCount: 0,
  };

  const courtsSet = new Set<string>();
  const rmnpDates: string[] = [];
  let totalAmount = 0;
  let prescribedAmount = 0;
  let hasAmount = false;

  fines.forEach(fine => {
    if (fine.prescriptionStatus === 'PRESCRITA') {
      summary.prescribedCount++;
    } else if (fine.prescriptionStatus === 'NO_PRESCRITA') {
      summary.notPrescribedCount++;
    } else {
      summary.reviewCount++;
    }

    if (fine.isTagFine) summary.tagFines++;
    else summary.nonTagFines++;

    if (fine.court) courtsSet.add(fine.court);

    if (fine.rmnpEntryDate) {
      rmnpDates.push(fine.rmnpEntryDate);
    } else {
      summary.missingRmnpEntryDateCount++;
    }

    if (fine.arancelAmount) {
      totalAmount += fine.arancelAmount;
      hasAmount = true;
      if (fine.prescriptionStatus === 'PRESCRITA') {
        prescribedAmount += fine.arancelAmount;
      }
    }
  });

  if (hasAmount) {
    summary.totalAmount = totalAmount;
    summary.prescribedAmount = prescribedAmount;
  }

  summary.courts = Array.from(courtsSet).sort();

  if (rmnpDates.length > 0) {
    rmnpDates.sort();
    summary.oldestRmnpEntryDate = rmnpDates[0];
    summary.newestRmnpEntryDate = rmnpDates[rmnpDates.length - 1];
  }

  return summary;
}

export function validateParsedCertificate(
  certificate: CertificateHeader,
  fines: Fine[]
): string[] {
  const warnings: string[] = [];

  if (!certificate.vehiclePlateNormalized) {
    warnings.push('No se detectó patente del vehículo.');
  }

  if (fines.length === 0) {
    warnings.push('No se detectaron multas en el certificado.');
  }

  const idSet = new Set<string>();
  fines.forEach(fine => {
    if (!fine.id) {
      warnings.push('Se encontró una multa sin ID.');
    } else if (idSet.has(fine.id)) {
      warnings.push(`Multa duplicada: ID ${fine.id}`);
    } else {
      idSet.add(fine.id);
    }

    if (!fine.rmnpEntryDate) {
      warnings.push(
        `Multa ${fine.id}: No se detectó Fecha Ingreso RMNP.`
      );
    }

    if (!fine.court) {
      warnings.push(`Multa ${fine.id}: No se detectó tribunal.`);
    }

    if (!fine.rol) {
      warnings.push(`Multa ${fine.id}: No se detectó rol.`);
    }
  });

  return warnings;
}

export async function parseRmnpCertificate(
  text: string,
  requestId: string = ''
): Promise<AnalysisResult> {
  // Normalizar texto
  const normalized = normalizeCertificateText(text);

  // Parsear header
  const certificate = parseCertificateHeader(normalized);

  // Dividir en bloques de multas
  const blocks = splitFineBlocks(normalized);

  // Parsear cada bloque
  const fines = blocks.map(block => parseFineBlock(block));

  // Calcular prescripción
  const now = new Date();
  const calculatedFines = fines.map(fine =>
    calculatePrescription(fine, now)
  );

  // Generar resumen
  const summary = buildFineSummary(calculatedFines);

  // Validar y generar warnings
  const warnings = validateParsedCertificate(certificate, calculatedFines);

  return {
    requestId,
    certificate,
    fines: calculatedFines,
    summary,
    warnings,
    extractedAt: new Date().toISOString(),
  };
}
