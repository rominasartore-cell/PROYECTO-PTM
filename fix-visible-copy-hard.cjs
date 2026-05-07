const fs = require("fs");

const file = "src/app/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.copyFileSync(file, `${file}.bak-hard-copy-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// 1) Botones "Analizar mi certificado ?"
s = s.replace(
  /Analizar mi certificado\s*\?/g,
  "Analizar mi certificado \\u2192"
);

// 2) Candado roto del formulario
s = s.replace(
  /<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">.*?Tu informaci[oó]n se usa solo para este an[aá]lisis\.<\/div>/g,
  '<div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">\\u{1F512} Tu información se usa solo para este análisis.</div>'
);

// 3) Subtítulo negativo del resultado preliminar
s = s.replace(
  /:\s*"[^"]*los antecedentes extra[ií]dos del certificado, no se detectaron multas que habiliten la compra del informe completo\."/g,
  ': "Según los antecedentes extraídos del certificado, no se detectaron multas que habiliten la compra del informe completo."'
);

// 4) Textos con Obtún
s = s.replace(
  /Obt.n un informe documental respaldado por criterio jur[ií]dico profesional, con borradores editables\s*para revisar, completar y presentar\./g,
  "Obtén un informe documental respaldado por criterio jurídico profesional, con borradores editables para revisar, completar y presentar."
);

s = s.replace(
  /Obt.n tu informe en l[ií]nea y rec[ií]belo por correo dentro de 24 horas\./g,
  "Obtén tu informe en línea y recíbelo por correo dentro de 24 horas."
);

s = s.replace(
  /Descubre el monto asociado y obt.n tu informe para solicitar la\s*prescripci[oó]n personalmente\./g,
  "Descubre el monto asociado y obtén tu informe para solicitar la prescripción personalmente."
);

s = s.replace(
  /Obt.n un an[aá]lisis preliminar gratuito y compra solo si existen multas revisables conforme\s*al certificado aportado\. El informe completo se env.a a tu correo dentro de 24 horas\./g,
  "Obtén un análisis preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado. El informe completo se envía a tu correo dentro de 24 horas."
);

// 5) Objeto del paso "Obtén tu informe"
s = s.replace(
  /\{ icon: "[^"]*", title: "Obt.n tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripci[oó]n personalmente\." \}/g,
  '{ icon: "\\u{1F4E9}", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }'
);

// 6) FAQ rotas
s = s.replace(
  /\{ q: "[^"]*hago si compr[eé] y no recib. el correo\?",/g,
  '{ q: "¿Qué hago si compré y no recibí el correo?",'
);

s = s.replace(
  /\{ q: "[^"]*pasa despu[eé]s de presentar la solicitud\?",/g,
  '{ q: "¿Qué pasa después de presentar la solicitud?",'
);

// 7) Footer roto
s = s.replace(
  /<div className="mt-10 border-t border-white\/10 pt-6 text-center text-xs text-slate-500">.*?\{new Date\(\)\.getFullYear\(\)\} Prescribe tu Multa\. Todos los derechos\s*reservados\.<\/div>/g,
  '<div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.</div>'
);

// 8) Limpieza de símbolos rotos restantes en checks visibles
s = s.replace(/>\s*\?\?\s*\{item\}<\/span>/g, ">\\u2713 {item}</span>");
s = s.replace(/>\s*âœ“\s*\{item\}<\/span>/g, ">\\u2713 {item}</span>");

// 9) Reemplazos directos finales
s = s
  .split("SegÃºn").join("Según")
  .split("Obtún").join("Obtén")
  .split("envÃa").join("envía")
  .split("recibÃ").join("recibí")
  .split("?? Tu información").join("\\u{1F512} Tu información")
  .split('icon: "??", title: "Obtén tu informe"').join('icon: "\\u{1F4E9}", title: "Obtén tu informe"')
  .split("Analizar mi certificado ?").join("Analizar mi certificado \\u2192")
  .split("âœ“").join("\\u2713");

// 10) Guardar UTF-8
fs.writeFileSync(file, s, "utf8");

console.log("OK: parche duro de textos visibles aplicado.");
