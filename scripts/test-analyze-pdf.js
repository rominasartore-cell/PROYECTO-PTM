const fs = require("fs");
const path = require("path");
const { normalizeCertificateText, parseRmnpCertificate, calculateSummary } = require("./rmnp-parser-core");

async function parsePdfBuffer(buffer) {
  const mod = require("pdf-parse");

  if (typeof mod === "function") {
    console.log("pdf-parse mode: function");
    const data = await mod(buffer);
    return { text: data?.text || "", numpages: data?.numpages || data?.numPages || null };
  }

  if (typeof mod?.default === "function") {
    console.log("pdf-parse mode: default function");
    const data = await mod.default(buffer);
    return { text: data?.text || "", numpages: data?.numpages || data?.numPages || null };
  }

  if (typeof mod?.PDFParse === "function") {
    console.log("pdf-parse mode: PDFParse class");
    const parser = new mod.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return {
        text: typeof result === "string" ? result : result?.text || "",
        numpages: result?.total || result?.pages?.length || null,
      };
    } finally {
      if (typeof parser.destroy === "function") await parser.destroy();
    }
  }

  throw new Error(`pdf-parse no tiene export compatible. Keys: ${Object.keys(mod || {}).join(", ")}`);
}

async function extractTextFromPdf(buffer) {
  const pdfData = await parsePdfBuffer(buffer);
  const text = pdfData.text || "";
  const hasSelectableText = text.trim().length > 50;
  const isScanned = !hasSelectableText && (pdfData.numpages || 0) > 0;

  if (isScanned) throw new Error("El PDF parece escaneado o no contiene texto seleccionable. Requiere OCR.");
  if (!hasSelectableText) throw new Error("No se pudo extraer texto del PDF. Verifica que sea un certificado RMNP válido.");

  return { text: normalizeCertificateText(text), isScanned: false, pageCount: pdfData.numpages, hasSelectableText: true };
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("❌ Error: Debes proporcionar la ruta del archivo PDF");
    console.error("Uso: npm run test:analyze-pdf <ruta-del-pdf>");
    process.exit(1);
  }
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Error: El archivo no existe: ${pdfPath}`);
    process.exit(1);
  }

  try {
    console.log("🧪 Analizando PDF...\n");
    console.log(`📄 Archivo: ${path.basename(pdfPath)}`);
    console.log(`📍 Ruta completa: ${pdfPath}`);
    console.log("─".repeat(80) + "\n");

    const buffer = fs.readFileSync(pdfPath);
    console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024).toFixed(2)} KB\n`);

    console.log("▶️  Extrayendo texto del PDF...");
    const extraction = await extractTextFromPdf(buffer);
    console.log("✅ Texto extraído correctamente\n");
    console.log(`📋 Páginas encontradas: ${extraction.pageCount || "(no detectado)"}`);
    console.log(`📝 Caracteres extraídos: ${extraction.text.length}`);
    console.log(`🔤 Texto seleccionable: ${extraction.hasSelectableText ? "Sí" : "No"}`);
    console.log(`🖼️  PDF escaneado: ${extraction.isScanned ? "Sí" : "No"}\n`);

    console.log("▶️  Parseando certificado RMNP...");
    const { certificate, fines, warnings } = parseRmnpCertificate(extraction.text);
    const summary = calculateSummary(fines);
    console.log("✅ Certificado parseado correctamente\n");

    console.log("📋 INFORMACIÓN DEL CERTIFICADO:");
    console.log("─".repeat(80));
    console.log(`Folio: ${certificate.folio || "(no detectado)"}`);
    console.log(`Código de Verificación: ${certificate.verificationCode || "(no detectado)"}`);
    console.log(`Tipo: ${certificate.certificateType || "(no detectado)"}`);
    console.log(`Patente (Raw): ${certificate.vehiclePlateRaw || "(no detectado)"}`);
    console.log(`Patente (Normalizada): ${certificate.vehiclePlateNormalized || "(no detectada)"}`);
    console.log(`Propietario: ${certificate.ownerName || "(no detectado)"}`);
    console.log(`RUN: ${certificate.ownerRun || "(no detectado)"}`);
    console.log(`Fecha de Emisión: ${certificate.issueDate || "(no detectada)"}`);
    console.log(`Fecha de Adquisición: ${certificate.acquisitionDate || "(no detectada)"}`);
    console.log(`Páginas por texto: ${certificate.pages || "(no detectadas)"}\n`);

    console.log("📊 RESUMEN DE MULTAS:");
    console.log("─".repeat(80));
    console.log(`Total de multas detectadas: ${summary.totalFines}`);
    console.log(`  ✅ Prescritas: ${summary.prescribedCount}`);
    console.log(`  ❌ No prescritas: ${summary.notPrescribedCount}`);
    console.log(`  ⚠️  Requieren revisión: ${summary.reviewCount}`);
    console.log(`  🚗 TAG: ${summary.tagFines}`);
    console.log(`  🚦 No TAG: ${summary.nonTagFines}`);
    console.log(`\nMonto total: ${summary.totalAmount.toFixed(2)} UTM`);
    console.log(`Monto prescrito: ${summary.prescribedAmount.toFixed(2)} UTM`);
    console.log(`RMNP más antigua: ${summary.oldestRmnpEntryDate || "(no detectada)"}`);
    console.log(`RMNP más nueva: ${summary.newestRmnpEntryDate || "(no detectada)"}`);
    console.log(`Sin fecha RMNP: ${summary.missingRmnpEntryDateCount}`);
    console.log(`Tribunales detectados: ${summary.courts.length}`);
    for (const c of summary.courts) console.log(`  - ${c}`);
    console.log("");

    if (fines.length > 0) {
      const first = fines[0], last = fines[fines.length - 1];
      console.log("📌 PRIMERA MULTA:");
      console.log("─".repeat(80));
      console.log(`ID MULTA: ${first.idMulta}`);
      console.log(`ID interno: ${first.id}`);
      console.log(`Infracción: ${first.infraction}`);
      console.log(`Tribunal: ${first.court}`);
      console.log(`Rol: ${first.rol}`);
      console.log(`Año rol: ${first.rolYear}`);
      console.log(`Fecha ingreso RMNP: ${first.rmnpEntryDate || "(no detectada)"}`);
      console.log(`Fecha ingreso RMNP raw: ${first.rmnpEntryDateTimeRaw || "(no detectada)"}`);
      console.log(`Monto: ${first.amountRaw} -> ${first.amountNumeric}`);
      console.log(`TAG: ${first.isTagFine}`);
      console.log(`Años transcurridos: ${first.yearsElapsed !== null ? first.yearsElapsed.toFixed(2) : "(no calculado)"}`);
      console.log(`Estado: ${first.prescriptionStatus}`);

      if (fines.length > 1) {
        console.log("\n📌 ÚLTIMA MULTA:");
        console.log("─".repeat(80));
        console.log(`ID MULTA: ${last.idMulta}`);
        console.log(`ID interno: ${last.id}`);
        console.log(`Infracción: ${last.infraction}`);
        console.log(`Tribunal: ${last.court}`);
        console.log(`Rol: ${last.rol}`);
        console.log(`Año rol: ${last.rolYear}`);
        console.log(`Fecha ingreso RMNP: ${last.rmnpEntryDate || "(no detectada)"}`);
        console.log(`Años transcurridos: ${last.yearsElapsed !== null ? last.yearsElapsed.toFixed(2) : "(no calculado)"}`);
        console.log(`Estado: ${last.prescriptionStatus}`);
      }
      console.log("");
    }

    if (warnings.length > 0) {
      console.log("⚠️  ADVERTENCIAS:");
      console.log("─".repeat(80));
      warnings.forEach((w, i) => console.log(`${i + 1}. ${w}`));
      console.log("");
    }

    console.log("─".repeat(80));
    console.log("✅ Análisis completado exitosamente\n");
  } catch (error) {
    console.error("❌ Error al analizar el PDF:");
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main();
