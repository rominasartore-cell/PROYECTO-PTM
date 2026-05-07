const fs = require("fs");

const file = "src/app/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.copyFileSync(file, `${file}.bak-last-text-fix-${stamp}`);

let s = fs.readFileSync(file, "utf8");

function replaceAll(a, b) {
  s = s.split(a).join(b);
}

// Restos exactos visibles
replaceAll("Analizar mi certificado ?", "Analizar mi certificado ?");
replaceAll("SegÃºn", "Según");
replaceAll("Obtún", "Obtén");
replaceAll("envÃa", "envía");
replaceAll("recibÃ", "recibí");
replaceAll("Qué hago si compré y no recibí el correo?", "¿Qué hago si compré y no recibí el correo?");
replaceAll("Qué pasa después de presentar la solicitud?", "¿Qué pasa después de presentar la solicitud?");

// Mojibake por unicode codepoints, no por texto visible
replaceAll("\u00F0\u0178\u201D\u2019", "??"); // candado roto
replaceAll("\u00E2\u0153\u201C", "?");       // check roto
replaceAll("\u00F0\u0178\u201C", "??");      // icono correo incompleto

// Arreglos estructurales por si quedó basura adentro
s = s.replace(
  /<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">.*?Tu información se usa solo para este análisis\.<\/div>/,
  '<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">?? Tu información se usa solo para este análisis.</div>'
);

s = s.replace(
  /<span key=\{item\} className="flex items-center gap-2">.*?\{item\}<\/span>/g,
  '<span key={item} className="flex items-center gap-2">? {item}</span>'
);

s = s.replace(
  /\{ icon: ".*?", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente\." \}/,
  '{ icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }'
);

// Limpieza puntual adicional
replaceAll("Ã", "");
replaceAll("Â", "");
replaceAll("âœ“", "?");
replaceAll("ðŸ”’", "??");
replaceAll("ðŸ“", "??");

fs.writeFileSync(file, s, "utf8");

console.log("OK: último parche visual aplicado.");
