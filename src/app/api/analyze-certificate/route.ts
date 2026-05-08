import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FineStatus =
  | "POTENCIALMENTE_PRESCRITA"
  | "VIGENTE"
  | "REVISION_MANUAL";

type FineLog = {
  idMulta: string | null;
  fechaIngresoRmnp: string | null;
  fechaPrescripcionReferencial: string | null;
  prescripcionPorFecha: boolean | null;
  estado: FineStatus;
  montoUtm: number | null;
  montoPesos: number | null;
  tribunal: string | null;
  rolCausa: string | null;
  tipoInfraccion: string | null;
  observaciones: string[];
};

const DEFAULT_UTM_CLP = 70588;
const DEFAULT_PRESCRIPTION_YEARS = 3;
const DEFAULT_REFERENTIAL_LAWYER_FEE_CLP = 250000;

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];

  if (!raw) return fallback;

  const parsed = Number(
    raw
      .toString()
      .trim()
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function searchable(text: string): string {
  return stripDiacritics(normalizeText(text))
    .replace(/\bR\s*M\s*N\s*P\b/gi, "RMNP")
    .replace(/\bR\s*M\s*T\s*N\s*P\b/gi, "RMTNP")
    .replace(/\bU\s*T\s*M\b/gi, "UTM")
    .replace(/MONTO\s+MULTA\s*[–—-]\s*MONEDA/gi, "MONTO MULTA-MONEDA")
    .replace(/FECHA\s+DE\s+INGRESO/gi, "FECHA INGRESO")
    .trim();
}

function parseUtmNumber(value: string | null): number | null {
  if (!value) return null;

  let cleaned = value
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function parseDateCL(value: string | null): Date | null {
  if (!value) return null;

  const match = value.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) {
    year = year >= 50 ? 1900 + year : 2000 + year;
  }

  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateCL(date: Date | null): string | null {
  if (!date) return null;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function getToday(): Date {
  const forced = process.env.ANALYSIS_TODAY;

  if (forced) {
    const forcedDate = new Date(`${forced}T00:00:00`);

    if (!Number.isNaN(forcedDate.getTime())) {
      return forcedDate;
    }
  }

  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function isPotentiallyPrescribed(
  fechaIngreso: Date | null,
  years: number,
  today: Date
): boolean | null {
  if (!fechaIngreso) return null;

  return addYears(fechaIngreso, years) <= today;
}

function cleanValue(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[:;\-. ]+/, "")
    .replace(/[:;\-. ]+$/, "")
    .trim();

  if (!cleaned) return null;

  if (
    /^(FECHA|MONTO|ARANCEL|TOTAL|TRIBUNAL|ROL|CAUSA|TIPO|INFRACCION)$/i.test(
      cleaned
    )
  ) {
    return null;
  }

  return cleaned;
}

function findLabelPositions(text: string, regex: RegExp): number[] {
  const positions: number[] = [];
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    positions.push(match.index);

    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return positions;
}

function extractIdMultaFromSlice(slice: string): string | null {
  const afterLabel = slice.replace(/^\s*ID\s+MULTA\s*/i, "");
  const match = afterLabel.match(/[:\s\-]*([A-Z0-9][A-Z0-9./_-]{2,})/i);

  return cleanValue(match?.[1]);
}

function extractMontoUtmFromSlice(slice: string): number | null {
  const match = slice.match(
    /MONTO\s+MULTA\s*[-]?\s*MONEDA[\s:.-]*([0-9]{1,4}(?:[,.][0-9]{1,4})?)\s*UTM/i
  );

  if (!match?.[1]) return null;

  return parseUtmNumber(match[1]);
}

function extractFechaIngresoFromSlice(slice: string): string | null {
  const match = slice.match(
    /FECHA\s+INGRESO\s+(?:AL\s+)?(?:RMNP|RMTNP)[\s:.-]*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
  );

  return cleanValue(match?.[1]);
}

function extractTextAfterLabel(block: string, labelRegex: RegExp): string | null {
  const match = block.match(labelRegex);

  if (!match?.index && match?.index !== 0) return null;

  const slice = block.slice(match.index, match.index + 220);

  const knownNextLabel =
    /(?:ID\s+MULTA|FECHA\s+INGRESO|MONTO\s+MULTA|ARANCEL|TOTAL|TRIBUNAL|JUZGADO|ROL|CAUSA|TIPO\s+INFRACCION|INFRACCION|DESCRIPCION)/i;

  const withoutLabel = slice.replace(labelRegex, "").replace(/^[:\s.-]+/, "");
  const next = withoutLabel.search(knownNextLabel);
  const value = next >= 0 ? withoutLabel.slice(0, next) : withoutLabel;

  return cleanValue(value.split("\n")[0]);
}

function extractIdMulta(block: string): string | null {
  const s = searchable(block);
  const pos = s.search(/\bID\s+MULTA\b/i);

  if (pos < 0) return null;

  return extractIdMultaFromSlice(s.slice(pos, pos + 120));
}

function extractFechaIngresoRmnp(block: string): string | null {
  const s = searchable(block);
  const pos = s.search(/\bFECHA\s+INGRESO\s+(?:AL\s+)?(?:RMNP|RMTNP)\b/i);

  if (pos < 0) return null;

  return extractFechaIngresoFromSlice(s.slice(pos, pos + 180));
}

function extractMontoUtm(block: string): number | null {
  const s = searchable(block);
  const pos = s.search(/\bMONTO\s+MULTA\s*[-]?\s*MONEDA\b/i);

  if (pos < 0) return null;

  return extractMontoUtmFromSlice(s.slice(pos, pos + 180));
}

function extractTribunal(block: string): string | null {
  const s = searchable(block);

  return (
    extractTextAfterLabel(s, /\bTRIBUNAL\b/i) ||
    extractTextAfterLabel(s, /\bJUZGADO\b/i)
  );
}

function extractRolCausa(block: string): string | null {
  const s = searchable(block);

  return (
    extractTextAfterLabel(s, /\bROL\s+CAUSA\b/i) ||
    extractTextAfterLabel(s, /\bROL\b/i) ||
    extractTextAfterLabel(s, /\bCAUSA\b/i)
  );
}

function extractTipoInfraccion(block: string): string | null {
  const s = searchable(block);

  return (
    extractTextAfterLabel(s, /\bTIPO\s+INFRACCION\b/i) ||
    extractTextAfterLabel(s, /\bTIPO\s+DE\s+INFRACCION\b/i) ||
    extractTextAfterLabel(s, /\bDESCRIPCION\s+INFRACCION\b/i) ||
    extractTextAfterLabel(s, /\bINFRACCION\b/i)
  );
}

function splitFineBlocks(text: string): string[] {
  const s = searchable(text);

  let positions = findLabelPositions(s, /\bID\s+MULTA\b/gi);

  if (positions.length === 0) {
    positions = findLabelPositions(
      s,
      /\bFECHA\s+INGRESO\s+(?:AL\s+)?(?:RMNP|RMTNP)\b/gi
    );
  }

  if (positions.length === 0) {
    positions = findLabelPositions(s, /\bMONTO\s+MULTA\s*[-]?\s*MONEDA\b/gi);
  }

  if (positions.length === 0) return [];

  const blocks: string[] = [];

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : s.length;
    const block = s.slice(start, end).trim();

    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

function buildFineLogFromValues(args: {
  idMulta: string | null;
  fechaIngresoRmnp: string | null;
  montoUtm: number | null;
  tribunal: string | null;
  rolCausa: string | null;
  tipoInfraccion: string | null;
  utmClp: number;
  prescriptionYears: number;
  today: Date;
}): FineLog {
  const observaciones: string[] = [];

  const fechaIngresoDate = parseDateCL(args.fechaIngresoRmnp);
  const fechaIngresoRmnp = formatDateCL(fechaIngresoDate);

  const prescripcionPorFecha = isPotentiallyPrescribed(
    fechaIngresoDate,
    args.prescriptionYears,
    args.today
  );

  const fechaPrescripcionReferencial = fechaIngresoDate
    ? formatDateCL(addYears(fechaIngresoDate, args.prescriptionYears))
    : null;

  let estado: FineStatus = "REVISION_MANUAL";

  if (prescripcionPorFecha === true) {
    estado = "POTENCIALMENTE_PRESCRITA";
  }

  if (prescripcionPorFecha === false) {
    estado = "VIGENTE";
  }

  if (!args.idMulta) {
    observaciones.push("No se pudo extraer ID MULTA.");
  }

  if (!fechaIngresoRmnp) {
    observaciones.push("No se pudo extraer FECHA INGRESO RMNP/RMTNP.");
    estado = "REVISION_MANUAL";
  }

  if (args.montoUtm === null) {
    observaciones.push(
      "No se encontró MONTO MULTA-MONEDA en UTM. Se ignora ARANCEL/TOTAL y no se inventa monto."
    );
  }

  if (prescripcionPorFecha === true && args.montoUtm === null) {
    estado = "REVISION_MANUAL";
    observaciones.push(
      "La fecha sugiere prescripción, pero falta monto UTM. Requiere revisión manual."
    );
  }

  const montoPesos =
    prescripcionPorFecha === true && args.montoUtm !== null
      ? Math.round(args.montoUtm * args.utmClp)
      : null;

  return {
    idMulta: args.idMulta,
    fechaIngresoRmnp,
    fechaPrescripcionReferencial,
    prescripcionPorFecha,
    estado,
    montoUtm: args.montoUtm,
    montoPesos,
    tribunal: args.tribunal,
    rolCausa: args.rolCausa,
    tipoInfraccion: args.tipoInfraccion,
    observaciones,
  };
}

function analyzeFineBlock(
  block: string,
  options: {
    utmClp: number;
    prescriptionYears: number;
    today: Date;
  }
): FineLog {
  return buildFineLogFromValues({
    idMulta: extractIdMulta(block),
    fechaIngresoRmnp: extractFechaIngresoRmnp(block),
    montoUtm: extractMontoUtm(block),
    tribunal: extractTribunal(block),
    rolCausa: extractRolCausa(block),
    tipoInfraccion: extractTipoInfraccion(block),
    utmClp: options.utmClp,
    prescriptionYears: options.prescriptionYears,
    today: options.today,
  });
}

function collectIds(text: string): (string | null)[] {
  const s = searchable(text);
  const positions = findLabelPositions(s, /\bID\s+MULTA\b/gi);

  return positions.map((pos) => extractIdMultaFromSlice(s.slice(pos, pos + 120)));
}

function collectDates(text: string): (string | null)[] {
  const s = searchable(text);
  const positions = findLabelPositions(
    s,
    /\bFECHA\s+INGRESO\s+(?:AL\s+)?(?:RMNP|RMTNP)\b/gi
  );

  return positions.map((pos) =>
    extractFechaIngresoFromSlice(s.slice(pos, pos + 180))
  );
}

function collectAmounts(text: string): (number | null)[] {
  const s = searchable(text);
  const positions = findLabelPositions(s, /\bMONTO\s+MULTA\s*[-]?\s*MONEDA\b/gi);

  return positions.map((pos) => extractMontoUtmFromSlice(s.slice(pos, pos + 180)));
}

function buildLogsFromParallelFields(
  text: string,
  options: {
    utmClp: number;
    prescriptionYears: number;
    today: Date;
  }
): FineLog[] {
  const ids = collectIds(text);
  const dates = collectDates(text);
  const amounts = collectAmounts(text);

  const count = Math.max(ids.length, dates.length, amounts.length);

  if (count === 0) return [];

  const logs: FineLog[] = [];

  for (let i = 0; i < count; i++) {
    logs.push(
      buildFineLogFromValues({
        idMulta: ids[i] ?? null,
        fechaIngresoRmnp: dates[i] ?? null,
        montoUtm: amounts[i] ?? null,
        tribunal: null,
        rolCausa: null,
        tipoInfraccion: null,
        utmClp: options.utmClp,
        prescriptionYears: options.prescriptionYears,
        today: options.today,
      })
    );
  }

  return logs;
}

function parserScore(logs: FineLog[]): number {
  return logs.reduce((score, fine) => {
    let value = score;

    if (fine.idMulta) value += 1;
    if (fine.fechaIngresoRmnp) value += 4;
    if (fine.montoUtm !== null) value += 3;
    if (fine.prescripcionPorFecha !== null) value += 3;

    return value;
  }, 0);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data?.text || "";
  } catch (error) {
    console.error("PDF_PARSE_ERROR", error);

    throw new Error(
      "No se pudo leer el PDF. Si el certificado viene escaneado como imagen, requiere OCR."
    );
  }
}

function buildResponse(logs: FineLog[], debug: Record<string, unknown>) {
  const utmClp = getEnvNumber("UTM_CLP", DEFAULT_UTM_CLP);
  const prescriptionYears = getEnvNumber(
    "PRESCRIPTION_YEARS",
    DEFAULT_PRESCRIPTION_YEARS
  );
  const referentialLawyerFeeClp = getEnvNumber(
    "REFERENTIAL_LAWYER_FEE_CLP",
    DEFAULT_REFERENTIAL_LAWYER_FEE_CLP
  );

  const multasTotalesDetectadas = logs.length;

  const multasPotencialmentePrescritas = logs.filter(
    (fine) => fine.prescripcionPorFecha === true
  );

  const multasPrescritasConMonto = logs.filter(
    (fine) => fine.prescripcionPorFecha === true && fine.montoUtm !== null
  );

  const multasPrescritasRevisionManual = logs.filter(
    (fine) => fine.prescripcionPorFecha === true && fine.montoUtm === null
  );

  const sumaTotalUtmPrescritas = Number(
    multasPrescritasConMonto
      .reduce((sum, fine) => sum + (fine.montoUtm ?? 0), 0)
      .toFixed(2)
  );

  const montoPotencialPesos = Math.round(sumaTotalUtmPrescritas * utmClp);
  const totalReferencial = montoPotencialPesos + referentialLawyerFeeClp;

  const resumen = {
    multasTotalesDetectadas,
    multasPotencialmentePrescritas: multasPotencialmentePrescritas.length,
    multasPrescritasConMonto: multasPrescritasConMonto.length,
    multasPrescritasRevisionManual: multasPrescritasRevisionManual.length,
    sumaTotalUtmPrescritas,
    valorUtmUsado: utmClp,
    montoPotencialPesos,
    ahorroReferencialTramitacionPersonalAbogado: referentialLawyerFeeClp,
    totalReferencial,
    criterioPrescripcionAnios: prescriptionYears,
  };

  const frontendResult = {
    multasTotalesDetectadas,
    totalMultas: multasTotalesDetectadas,
    multasTotales: multasTotalesDetectadas,
    totalFines: multasTotalesDetectadas,
    finesTotal: multasTotalesDetectadas,
    totalFinesDetected: multasTotalesDetectadas,
    finesCount: multasTotalesDetectadas,

    multasPotencialmentePrescritas: multasPotencialmentePrescritas.length,
    multasPrescritas: multasPotencialmentePrescritas.length,
    prescribedCount: multasPotencialmentePrescritas.length,
    prescribedFinesCount: multasPotencialmentePrescritas.length,
    potentiallyPrescribedCount: multasPotencialmentePrescritas.length,
    potentialPrescribedCount: multasPotencialmentePrescritas.length,
    expiredFinesCount: multasPotencialmentePrescritas.length,
    prescriptionCount: multasPotencialmentePrescritas.length,

    multasPrescritasConMonto: multasPrescritasConMonto.length,
    multasPrescritasRevisionManual: multasPrescritasRevisionManual.length,

    sumaTotalUtmPrescritas,
    totalUtmPrescritas: sumaTotalUtmPrescritas,
    totalPrescribedUtm: sumaTotalUtmPrescritas,
    prescribedUtmTotal: sumaTotalUtmPrescritas,
    totalUtm: sumaTotalUtmPrescritas,
    utmTotal: sumaTotalUtmPrescritas,

    valorUtmUsado: utmClp,
    valorUtmClp: utmClp,
    utmClp,
    currentUtmValue: utmClp,
    usedUtmValue: utmClp,

    montoPotencialPesos,
    montoPotencialClp: montoPotencialPesos,
    montoTotalPrescrito: montoPotencialPesos,
    montoTotalMultasPrescritas: montoPotencialPesos,
    totalPotentialAmount: montoPotencialPesos,
    potentialAmount: montoPotencialPesos,
    amountPotentiallyPrescribed: montoPotencialPesos,
    potentialSavingsAmount: montoPotencialPesos,
    totalSavings: montoPotencialPesos,
    savingsAmount: montoPotencialPesos,

    ahorroReferencial: referentialLawyerFeeClp,
    ahorroReferencialTramitacionPersonalAbogado: referentialLawyerFeeClp,
    lawyerFee: referentialLawyerFeeClp,
    attorneyFee: referentialLawyerFeeClp,
    honorariosReferenciales: referentialLawyerFeeClp,

    totalReferencial,
    referentialTotal: totalReferencial,
    totalWithFees: totalReferencial,

    logs,
  };

  return {
    ok: true,
    success: true,

    resumen,

    result: frontendResult,
    analysis: frontendResult,
    analysisResult: frontendResult,
    preliminaryResult: frontendResult,
    data: frontendResult,

    ...frontendResult,

    debug: {
      ...debug,
      ignoraArancel: true,
      fuenteMontoValida: "MONTO MULTA-MONEDA : X,XX UTM",
      noUsaArancel: true,
      noUsaTotal: true,
      noUsaPesosSueltos: true,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const uploadedFile =
      formData.get("file") ||
      formData.get("pdf") ||
      formData.get("certificate") ||
      formData.get("certificado");

    if (!uploadedFile || typeof (uploadedFile as File).arrayBuffer !== "function") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se recibió archivo PDF. Envía el archivo en el campo file, pdf, certificate o certificado.",
        },
        { status: 400 }
      );
    }

    const file = uploadedFile as File;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rawText = await extractPdfText(buffer);
    const text = searchable(rawText);

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo extraer texto del PDF. Probablemente es un PDF escaneado y requiere OCR.",
        },
        { status: 422 }
      );
    }

    const utmClp = getEnvNumber("UTM_CLP", DEFAULT_UTM_CLP);
    const prescriptionYears = getEnvNumber(
      "PRESCRIPTION_YEARS",
      DEFAULT_PRESCRIPTION_YEARS
    );
    const today = getToday();

    const fineBlocks = splitFineBlocks(text);

    const blockLogs = fineBlocks.map((block) =>
      analyzeFineBlock(block, {
        utmClp,
        prescriptionYears,
        today,
      })
    );

    const parallelLogs = buildLogsFromParallelFields(text, {
      utmClp,
      prescriptionYears,
      today,
    });

    const blockScore = parserScore(blockLogs);
    const parallelScore = parserScore(parallelLogs);

    const useParallelParser =
      parallelLogs.length > 0 &&
      parallelScore >= blockScore &&
      parallelLogs.length >= blockLogs.length;

    const logs = useParallelParser ? parallelLogs : blockLogs;

    const analysisResponse = buildResponse(logs, {
      parserUsado: useParallelParser
        ? "parallel-fields"
        : "blocks-by-id-multa",
      bloquesDetectados: fineBlocks.length,
      blockScore,
      parallelScore,
      idsDetectados: collectIds(text).length,
      fechasIngresoDetectadas: collectDates(text).length,
      montosUtmDetectados: collectAmounts(text).length,
      textoPreview: text.slice(0, 1200),
    });

    const responseAny = analysisResponse as any;
    const resultAny =
      responseAny.result ||
      responseAny.analysis ||
      responseAny.analysisResult ||
      responseAny.preliminaryResult ||
      responseAny.data ||
      responseAny;

    const customerName = String(
      formData.get("name") ||
        formData.get("fullName") ||
        formData.get("nombre") ||
        "Sin nombre"
    ).trim();

    const customerEmail = String(
      formData.get("email") ||
        formData.get("correo") ||
        formData.get("customer_email") ||
        ""
    ).trim();

    const vehiclePlate = String(
      formData.get("plate") ||
        formData.get("patente") ||
        formData.get("vehicle_plate") ||
        ""
    )
      .trim()
      .toUpperCase();

    const requestId = String(
      responseAny.requestId ||
        responseAny.request_id ||
        resultAny.requestId ||
        resultAny.request_id ||
        `ptm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    const toNumber = (value: unknown): number => {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : 0;
    };

    const fineCount = toNumber(
      resultAny.totalFines ??
        resultAny.totalMultas ??
        resultAny.finesTotal ??
        resultAny.totalFinesDetected ??
        resultAny.finesCount
    );

    const prescribedCount = toNumber(
      resultAny.prescribedCount ??
        resultAny.multasPotencialmentePrescritas ??
        resultAny.multasPrescritas ??
        resultAny.multasSusceptibles ??
        resultAny.prescribedFinesCount ??
        resultAny.potentiallyPrescribedCount
    );

    const totalAmountUtm = toNumber(
      resultAny.totalPrescribedUtm ??
        resultAny.sumaTotalUtmPrescritas ??
        resultAny.totalUtmPrescritas ??
        resultAny.prescribedUtmTotal ??
        resultAny.totalUtm ??
        resultAny.utmTotal
    );

    const originalFileName = file.name || "certificado.pdf";
    const safeFileName = originalFileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-120);

    let pdfPath: string | null = null;
    let pdfUrl: string | null = null;

    try {
      pdfPath = `${requestId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("certificados")
        .upload(pdfPath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("[analyze-certificate] Supabase storage upload error:", uploadError);
        pdfPath = null;
      }
    } catch (storageError) {
      console.error("[analyze-certificate] Unexpected storage error:", storageError);
      pdfPath = null;
    }

    const finalResponse = {
      ...responseAny,
      requestId,
      request_id: requestId,
      pdfPath,
      pdf_path: pdfPath,
      pdfFilename: safeFileName,
      pdf_filename: safeFileName,
    };

    try {
      const { error: dbError } = await supabaseAdmin
        .from("analysis_requests")
        .upsert(
          {
            customer_name: customerName,
            customer_email: customerEmail,
            vehicle_plate: vehiclePlate,
            request_id: requestId,
            status: "pending",
            fine_count: fineCount,
            prescribed_count: prescribedCount,
            total_amount_utm: totalAmountUtm,
            utm_value_clp: utmClp,
            payment_status: "pending",
            raw_analysis_json: finalResponse,
            internal_notes: "",
            pdf_path: pdfPath,
            pdf_filename: safeFileName,
            pdf_url: pdfUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "request_id" }
        );

      if (dbError) {
        console.error("[analyze-certificate] Supabase upsert error:", dbError);
      }
    } catch (dbUnexpectedError) {
      console.error("[analyze-certificate] Unexpected database error:", dbUnexpectedError);
    }

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error("ANALYZE_CERTIFICATE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al analizar el certificado.",
      },
      { status: 500 }
    );
  }
}
