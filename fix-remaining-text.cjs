const fs = require("fs");

const file = "src/app/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.copyFileSync(file, `${file}.bak-remaining-text-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// Reemplazos generales restantes
s = s.split("ðŸ”’").join("??");
s = s.split("ðŸ“").join("??");
s = s.split("âœ“").join("?");
s = s.split("SegÃºn").join("Según");
s = s.split("recibÃ").join("recibí");
s = s.split("envÃa").join("envía");
s = s.split("Obtún").join("Obtén");
s = s.split("Analizar mi certificado ?").join("Analizar mi certificado ?");

// Arreglos puntuales
s = s.replace(
  /<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">.*?Tu información se usa solo para este análisis\.<\/div>/,
  '<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">?? Tu información se usa solo para este análisis.</div>'
);

s = s.replace(
  /\{ icon: ".*?", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente\." \}/,
  '{ icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }'
);

s = s.replace(
  /\{ q: "Qué hago si compré y no recibí el correo\?",/,
  '{ q: "¿Qué hago si compré y no recibí el correo?",'
);

s = s.replace(
  /\{ q: "Qué pasa después de presentar la solicitud\?",/,
  '{ q: "¿Qué pasa después de presentar la solicitud?",'
);

s = s.replace(
  /Obtén un análisis preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado\. El informe completo se envía a tu correo dentro de 24 horas\./g,
  "Obtén un análisis preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado. El informe completo se envía a tu correo dentro de 24 horas."
);

// Limpieza final de caracteres raros visibles
s = s.split("Ã").join("");
s = s.split("Â").join("");
s = s.split("â").join("");
s = s.split("ð").join("");

fs.writeFileSync(file, s, "utf8");

console.log("OK: limpieza final aplicada.");
