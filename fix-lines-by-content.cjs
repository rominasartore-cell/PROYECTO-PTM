const fs = require("fs");

const file = "src/app/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.copyFileSync(file, `${file}.bak-lines-by-content-${stamp}`);

let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

lines = lines.map((line) => {
  if (line.includes("habiliten la compra del informe completo")) {
    return '    : "Según los antecedentes extraídos del certificado, no se detectaron multas que habiliten la compra del informe completo.";';
  }

  if (line.includes("informe documental respaldado por criterio")) {
    return '      <p className="mt-2 text-sm leading-relaxed text-slate-600">Obtén un informe documental respaldado por criterio jurídico profesional, con borradores editables para revisar, completar y presentar.</p>';
  }

  if (line.includes("tu informe en línea") && line.includes("24 horas")) {
    return '      <p className="text-sm font-bold text-blue-700">Obtén tu informe en línea y recíbelo por correo dentro de 24 horas.</p>';
  }

  if (line.includes("Descubre el monto asociado") && line.includes("solicitar")) {
    return '          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg lg:text-xl">Descubre el monto asociado y obtén tu informe para solicitar la prescripción personalmente.</p>';
  }

  if (line.includes('title: "Obt') && line.includes("Compra el informe completo")) {
    return '    { icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." },';
  }

  if (line.includes("hago si compr") && line.includes("correo?")) {
    return '    { q: "¿Qué hago si compré y no recibí el correo?", a: "Primero revisa spam, promociones o correo no deseado. Si el pago fue confirmado y no recibiste el correo, podrás usar el soporte de compra para solicitar el reenvío. Ese soporte es solo para incidencias de entrega, no para asesoría legal personalizada." },';
  }

  if (line.includes("pasa después de presentar la solicitud")) {
    return '    { q: "¿Qué pasa después de presentar la solicitud?", a: "La tramitación posterior depende del tribunal competente. Esto ocurre tanto si la solicitud la presenta una persona natural como si la presenta un abogado." },';
  }

  if (line.includes("análisis preliminar gratuito") && line.includes("compra solo si existen multas")) {
    return '            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">Obtén un análisis preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado. El informe completo se envía a tu correo dentro de 24 horas.</p>';
  }

  if (line.includes("Analizar mi certificado \\u2192")) {
    return line.replace("Analizar mi certificado \\u2192", "Analizar mi certificado ?");
  }

  if (line.includes("Analizar mi certificado ?")) {
    return line.replace("Analizar mi certificado ?", "Analizar mi certificado ?");
  }

  if (line.includes("?? Tu información se usa solo para este análisis")) {
    return '        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">?? Tu información se usa solo para este análisis.</div>';
  }

  if (line.includes("?? {new Date().getFullYear()}")) {
    return '        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.</div>';
  }

  return line;
});

let s = lines.join("\n");

// Limpieza adicional directa
s = s
  .split("SegÃºn").join("Según")
  .split("Obtún").join("Obtén")
  .split("envÃa").join("envía")
  .split("recibÃ").join("recibí")
  .split("Analizar mi certificado \\u2192").join("Analizar mi certificado ?");

fs.writeFileSync(file, s, "utf8");

console.log("OK: líneas visibles corregidas por contenido.");
