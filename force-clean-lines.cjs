const fs = require("fs");

const file = "src/app/page.tsx";

if (!fs.existsSync(file)) {
  console.error("No existe src/app/page.tsx");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, file + ".bak-force-clean-lines-" + stamp);

let s = fs.readFileSync(file, "utf8");

const a = String.fromCodePoint(0x00E1);
const e = String.fromCodePoint(0x00E9);
const i = String.fromCodePoint(0x00ED);
const o = String.fromCodePoint(0x00F3);
const u = String.fromCodePoint(0x00FA);
const invQ = String.fromCodePoint(0x00BF);
const copy = String.fromCodePoint(0x00A9);
const arrow = String.fromCodePoint(0x2192);
const lock = String.fromCodePoint(0x1F512);
const mail = String.fromCodePoint(0x1F4E9);
const check = String.fromCodePoint(0x2713);

const text = {
  segun: "Seg" + u + "n",
  extraidos: "extra" + i + "dos",
  obten: "Obt" + e + "n",
  juridico: "jur" + i + "dico",
  prescripcion: "prescripci" + o + "n",
  informacion: "informaci" + o + "n",
  analisis: "an" + a + "lisis",
  linea: "l" + i + "nea",
  recibelo: "rec" + i + "belo",
  envia: "env" + i + "a",
  que: "Qu" + e,
  compre: "compr" + e,
  recibi: "recib" + i,
  podras: "podr" + a + "s",
  reenvio: "reenv" + i + "o",
  asesoria: "asesor" + i + "a",
  tramitacion: "tramitaci" + o + "n",
  despues: "despu" + e + "s"
};

let lines = s.split(/\r?\n/);

lines = lines.map((line) => {
  if (line.includes("habiliten la compra del informe completo")) {
    return '    : "' + text.segun + ' los antecedentes ' + text.extraidos + ' del certificado, no se detectaron multas que habiliten la compra del informe completo.";';
  }

  if (line.includes("informe documental respaldado por criterio")) {
    return '      <p className="mt-2 text-sm leading-relaxed text-slate-600">' + text.obten + ' un informe documental respaldado por criterio ' + text.juridico + ' profesional, con borradores editables para revisar, completar y presentar.</p>';
  }

  if (line.includes("tu informe en") && line.includes("24 horas") && !line.includes("preliminar gratuito")) {
    return '      <p className="text-sm font-bold text-blue-700">' + text.obten + ' tu informe en ' + text.linea + ' y ' + text.recibelo + ' por correo dentro de 24 horas.</p>';
  }

  if (line.includes("Descubre el monto asociado") && line.includes("solicitar")) {
    return '          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg lg:text-xl">Descubre el monto asociado y ' + text.obten.toLowerCase() + ' tu informe para solicitar la ' + text.prescripcion + ' personalmente.</p>';
  }

  if (line.includes("Compra el informe completo") && line.includes("recibe por correo los documentos")) {
    return '    { icon: "' + mail + '", title: "' + text.obten + ' tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la ' + text.prescripcion + ' personalmente." },';
  }

  if (line.includes("hago si compr") && line.includes("correo?")) {
    return '    { q: "' + invQ + text.que + ' hago si ' + text.compre + ' y no ' + text.recibi + ' el correo?", a: "Primero revisa spam, promociones o correo no deseado. Si el pago fue confirmado y no recibiste el correo, ' + text.podras + ' usar el soporte de compra para solicitar el ' + text.reenvio + '. Ese soporte es solo para incidencias de entrega, no para ' + text.asesoria + ' legal personalizada." },';
  }

  if (line.includes("pasa despu") && line.includes("presentar la solicitud")) {
    return '    { q: "' + invQ + text.que + ' pasa ' + text.despues + ' de presentar la solicitud?", a: "La ' + text.tramitacion + ' posterior depende del tribunal competente. Esto ocurre tanto si la solicitud la presenta una persona natural como si la presenta un abogado." },';
  }

  if (line.includes("preliminar gratuito") && line.includes("compra solo si existen multas")) {
    return '            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">' + text.obten + ' un ' + text.analisis + ' preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado. El informe completo se ' + text.envia + ' a tu correo dentro de 24 horas.</p>';
  }

  if (line.includes("Analizar mi certificado ?") || line.includes("Analizar mi certificado \\u2192")) {
    return line.replace(/Analizar mi certificado\s*(\?|\\u2192)/g, "Analizar mi certificado " + arrow);
  }

  if (line.includes("?? Tu informaci") || line.includes("Tu informaci") && line.includes("solo para este")) {
    return '        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">' + lock + ' Tu ' + text.informacion + ' se usa solo para este ' + text.analisis + '.</div>';
  }

  if (line.includes("key={item}") && line.includes("{item}")) {
    return '              <span key={item} className="flex items-center gap-2">' + check + ' {item}</span>';
  }

  if (line.includes("new Date().getFullYear()") && line.includes("Prescribe tu Multa")) {
    return '        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">' + copy + ' {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.</div>';
  }

  return line;
});

s = lines.join("\n");

const replacements = [
  ["Seg??n", text.segun],
  ["Obt?n", text.obten],
  ["Obt?n", text.obten],
  ["env?a", text.envia],
  ["env??a", text.envia],
  ["recib?", text.recibi],
  ["Analizar mi certificado ?", "Analizar mi certificado " + arrow],
  ["Analizar mi certificado \\u2192", "Analizar mi certificado " + arrow],
  ["?? Tu informaci?n", lock + " Tu " + text.informacion],
  ['icon: "??", title: "Obt?n tu informe"', 'icon: "' + mail + '", title: "' + text.obten + ' tu informe"'],
  ['icon: "??", title: "Obt?n tu informe"', 'icon: "' + mail + '", title: "' + text.obten + ' tu informe"'],
  ["prescripci?n", text.prescripcion],
  ["informaci?n", text.informacion],
  ["an?lisis", text.analisis],
  ["jur?dico", text.juridico],
  ["?Qu?", invQ + text.que],
  ["compr?", text.compre],
  ["recib?", text.recibi],
  ["podr?s", text.podras],
  ["reenv?o", text.reenvio],
  ["asesor?a", text.asesoria]
];

for (const [bad, good] of replacements) {
  s = s.split(bad).join(good);
}

fs.writeFileSync(file, s, "utf8");

const bad = ["?", "?", "?", "?", "?", "Obt?n", "Obt?n", "env?", "recib?", "Analizar mi certificado ?", "??"];
let found = false;

s.split(/\r?\n/).forEach((line, idx) => {
  if (bad.some((b) => line.includes(b))) {
    found = true;
    console.log((idx + 1) + ": " + line);
  }
});

if (!found) {
  console.log("OK LIMPIO");
}