const fs = require("fs");
const path = require("path");
const { parseRmnpCertificate, calculateSummary } = require("./rmnp-parser-core");

function loadFixtureText() {
  const p = path.join(__dirname, "../src/lib/prescripcion-rmnp/__fixtures__/sample-certificate-text.json");
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    return raw.text || raw;
  }
  return `FOLIO : 2024-156789
Código Verificación:
abc123456
CERTIFICADO DE REGISTRO DE MULTAS
DE TRANSITO NO PAGADAS
VEHICULO PLACA PATENTE UNICA : FWTH.90-8

ID MULTA : 12345
INFRACCION : TRANSITAR SIN DISPOSITIVO ELECTRONICO
 POR AUTOPISTA CONCESIONADA
TRIBUNAL : 2 POLICIA LOCAL DE SAN BERNARDO
ROL : J123456 AÑO ROL : 2024
FECHA INFRACCION : 10-01-2024
FECHA SENTENCIA : 20-01-2024 00:00:00
MONTO MULTA-MONEDA : 3,50 UTM
ARANCEL : 4.570,00
MULTA TIPO TAG : 1
FECHA INFORME RMNP : 10-02-2024
FECHA INGRESO RMNP : 15-01-2024 12:00:00

ID MULTA : 67890
INFRACCION : NO RESPETAR SEÑALES DEL TRANSITO
TRIBUNAL : POLICIA LOCAL DE PEDRO AGUIRRE CERDA
ROL : 534418MAC AÑO ROL : 2022
FECHA INFRACCION : 01-01-2020
FECHA SENTENCIA : 10-03-2020 00:00:00
MONTO MULTA-MONEDA : 1,00 UTM
ARANCEL : 4.570,00
MULTA TIPO TAG : 0
FECHA INFORME RMNP : 20-03-2020
FECHA INGRESO RMNP : 22-03-2020 10:00:00

ID MULTA : 11111
INFRACCION : USO PISTA EXCLUSIVA PARA TRANSPORTE
 PÚBLICO
TRIBUNAL : 4 POLICIA LOCAL DE SANTIAGO
ROL : H370909 AÑO ROL : 2023
FECHA INFRACCION : 05-01-2021
FECHA SENTENCIA : 10-01-2022 00:00:00
MONTO MULTA-MONEDA : 1,00 UTM
ARANCEL : 4.570,00
MULTA TIPO TAG : 0
FECHA INFORME RMNP : 01-02-2022
FECHA INGRESO RMNP : 10-02-2022 11:00:00

DATOS DEL PROPIETARIO
Nombre : JUAN CARLOS PÉREZ GARCÍA
R.U.N. : 18.765.432-5
Fec. adquisición: 13-12-2013`;
}

console.log("🧪 Testing RMNP Certificate Parser\n");
const result = parseRmnpCertificate(loadFixtureText());
const summary = calculateSummary(result.fines);

const tests = [
  ["Detecta patente", result.certificate.vehiclePlateNormalized === "FWTH-90", result.certificate.vehiclePlateNormalized],
  ["Detecta folio", result.certificate.folio === "2024-156789", result.certificate.folio],
  ["Detecta propietario", result.certificate.ownerName === "JUAN CARLOS PÉREZ GARCÍA", result.certificate.ownerName],
  ["Detecta RUN", result.certificate.ownerRun === "18.765.432-5", result.certificate.ownerRun],
  ["Detecta todas las multas (3)", result.fines.length === 3, result.fines.length],
  ["Cada multa tiene ID MULTA", result.fines.every(f => f.idMulta), result.fines.map(f => f.idMulta).join(", ")],
  ["Cada multa tiene RMNP entry date", result.fines.every(f => f.rmnpEntryDate), result.fines.map(f => f.rmnpEntryDate).join(", ")],
  ["Calcula estados", result.fines[0]?.prescriptionStatus === "NO_PRESCRITA" && result.fines[1]?.prescriptionStatus === "PRESCRITA" && result.fines[2]?.prescriptionStatus === "PRESCRITA", result.fines.map(f => f.prescriptionStatus).join(", ")],
  ["Normaliza montos", result.fines[0]?.amountNumeric === 3.5, result.fines.map(f => `${f.amountRaw} → ${f.amountNumeric}`).join("; ")],
  ["Detecta roles alfanuméricos", result.fines[1]?.rol === "534418MAC" && result.fines[2]?.rol === "H370909", result.fines.map(f => f.rol).join(", ")],
  ["Detecta TAG boolean", result.fines[0]?.isTagFine === true && result.fines[1]?.isTagFine === false, result.fines.map(f => String(f.isTagFine)).join(", ")],
  ["No hay warnings críticos", result.warnings.length === 0, result.warnings.join("; ")],
];

let passed = 0, failed = 0;
for (const [name, ok, value] of tests) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (ok) passed++;
  else { console.log(`  Got: ${value}`); failed++; }
}
console.log("\n" + "─".repeat(80));
console.log(`📊 Summary: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
console.log(`Resumen parser: total=${summary.totalFines}, prescritas=${summary.prescribedCount}, noPrescritas=${summary.notPrescribedCount}, revisión=${summary.reviewCount}`);
process.exit(failed === 0 ? 0 : 1);
