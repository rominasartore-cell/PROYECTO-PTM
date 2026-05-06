export type PrescriptionStatus = 'PRESCRITA' | 'NO_PRESCRITA' | 'REQUIERE_REVISION';
export type Confidence = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Fine {
  id: string;
  rol: string | null;
  rolYear: string | null;
  court: string | null;
  municipality: string | null;
  infraction: string | null;
  infractionDate: string | null;
  sentenceDate: string | null;
  plate: string | null;
  fineAmountRaw: string | null;
  fineAmountUtm: number | null;
  arancelRaw: string | null;
  arancelAmount: number | null;
  isTagFine: boolean | null;
  rmnpReportDate: string | null;
  rmnpEntryDate: string | null;
  rmnpEntryDateTimeRaw: string | null;
  prescriptionStatus: PrescriptionStatus;
  yearsElapsed: number | null;
  daysElapsed: number | null;
  reason: string;
  confidence: Confidence;
  sourceBlock: string;
}

export interface CertificateHeader {
  folio: string | null;
  verificationCode: string | null;
  certificateType: string | null;
  vehiclePlateRaw: string | null;
  vehiclePlateNormalized: string | null;
  issueDate: string | null;
  ownerName: string | null;
  ownerRun: string | null;
  acquisitionDate: string | null;
  pagesDetected: number | null;
}

export interface AnalysisSummary {
  totalFines: number;
  prescribedCount: number;
  notPrescribedCount: number;
  reviewCount: number;
  totalAmount: number | null;
  prescribedAmount: number | null;
  tagFines: number;
  nonTagFines: number;
  courts: string[];
  oldestRmnpEntryDate: string | null;
  newestRmnpEntryDate: string | null;
  missingRmnpEntryDateCount: number;
}

export interface AnalysisResult {
  requestId: string;
  certificate: CertificateHeader;
  fines: Fine[];
  summary: AnalysisSummary;
  warnings: string[];
  extractedAt: string;
}

export interface ExtractedText {
  text: string;
  isScanned: boolean;
  confidence: number;
  pageCount: number;
}

export interface RequestMetadata {
  requestId: string;
  customerName: string;
  customerEmail: string;
  vehiclePlate: string;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'completed' | 'failed';
}
