const fs = require("fs");

const file = "src/app/page.tsx";

if (!fs.existsSync(file)) {
  console.error("No existe src/app/page.tsx");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-mojibake-${stamp}`);

let s = fs.readFileSync(file, "utf8");

const replacements = [
  ["Juan PÃrez", "Juan Pérez"],
  ["CÃ³mo funciona", "Cómo funciona"],
  ["NavegaciÃ³n", "Navegación"],
  ["Cerrar menÃº", "Cerrar menú"],
  ["Abrir menÃº", "Abrir menú"],
  ["MÃx.", "Máx."],
  ["MÃ¡x.", "Máx."],
  ["ÂNo tienes", "¿No tienes"],
  ["aquÃ­", "aquí"],
  ["devolviÃ³", "devolvió"],
  ["OcurriÃ³", "Ocurrió"],
  ["AnÃlisis", "Análisis"],
  ["anÃlisis", "análisis"],
  ["podrÃ­an", "podrían"],
  ["podrÃan", "podrían"],
  ["prescripciÃ³n", "prescripción"],
  ["representaciÃ³n", "representación"],
  ["presentaciÃ³n", "presentación"],
  ["garantÃa", "garantía"],
  ["garantÃ­a", "garantía"],
  ["informaciÃ³n", "información"],
  ["PodrÃ­as", "Podrías"],
  ["segÃºn", "según"],
  ["TramitaciÃ³n", "Tramitación"],
  ["tramitaciÃ³n", "tramitación"],
  ["recÃ­belo", "recíbelo"],
  ["recibiÃ³", "recibió"],
  ["Recibe", "Recibe"],
  ["bÃsicas", "básicas"],
  ["bÃ¡sicas", "básicas"],
  ["eliminaciÃ³n", "eliminación"],
  ["extinciÃ³n", "extinción"],
  ["declaraciÃ³n", "declaración"],
  ["decisiÃ³n", "decisión"],
  ["despuÃs", "después"],
  ["despuÃ©s", "después"],
  ["extrÃ­dos", "extraídos"],
  ["extraÃ­dos", "extraídos"],
  ["podrÃas", "podrías"],
  ["RevisiÃ³n", "Revisión"],
  ["TramÃ­talo", "Tramítalo"],
  ["tÃº", "tú"],
  ["ObtÃn", "Obtén"],
  ["ObtÃ©n", "Obtén"],
  ["jurÃdico", "jurídico"],
  ["jurÃ­dico", "jurídico"],
  ["lÃ­nea", "línea"],
  ["trÃnsito", "tránsito"],
  ["trÃ¡nsito", "tránsito"],
  ["electrÃ³nico", "electrónico"],
  ["diseÃ±ado", "diseñado"],
  ["estÃ¡", "está"],
  ["habrÃ¡", "habrá"],
  ["habrÃ", "habrá"],
  ["recepciÃ³n", "recepción"],
  ["asesorÃa", "asesoría"],
  ["asesorÃ­a", "asesoría"],
  ["envÃ­an", "envían"],
  ["envÃan", "envían"],
  ["tambiÃn", "también"],
  ["tambiÃ©n", "también"],
  ["comprÃ", "compré"],
  ["podrÃs", "podrás"],
  ["reenvÃo", "reenvío"],
  ["bÃsico", "básico"],
  ["bÃ¡sico", "básico"],
  ["rÃpidas", "rápidas"],
  ["rÃ¡pidas", "rápidas"],
  ["estÃ", "está"],
  ["trÃmite", "trámite"],
  ["trÃ¡mite", "trámite"],
  ["mÃ¡s", "más"],
  ["mÃs", "más"],
  ["pÃ¡gina", "página"],
  ["cÃ¡lculo", "cálculo"],
  ["cÃlculo", "cálculo"],
  ["CuÃ¡ndo", "Cuándo"],
  ["CuÃndo", "Cuándo"],
  ["QuÃ©", "Qué"],
  ["QuÃ", "Qué"],
  ["Â¿CuÃ", "¿Cuá"],
  ["Â¿QuÃ", "¿Qué"],
  ["Â¿El", "¿El"],
  ["Â¿Incluye", "¿Incluye"],
  ["Â¿Sirve", "¿Sirve"],
  ["Â¿Cuándo", "¿Cuándo"],
  ["Â¿Qué", "¿Qué"],
  ["Â©", "©"],
  ["Â ", ""],
  ["Â", ""],

  ["âœ“", "\\u2713"],
  ["â†’", "\\u2192"],
  ["â†—", "\\u2197"],
  ["âŒ„", "\\u2304"],
  ["â¬†", "\\u2B06"],
  ["âš–", "\\u2696"],
  ["â˜°", "\\u2630"],
  ["â˜", "\\u2630"],
  ["Ã—", "\\u00D7"],

  ["ğŸ’°", "\\u{1F4B0}"],
  ["ğŸ’", "\\u{1F4B0}"],
  ["ğŸ“„", "\\u{1F4C4}"],
  ["ğŸ“", "\\u{1F4E9}"],
  ["ğŸ“©", "\\u{1F4E9}"],
  ["ğŸ”’", "\\u{1F512}"],
  ["ğŸ”", "\\u{1F50E}"],
  ["ğŸ›¡", "\\u{1F6E1}\\uFE0F"],
  ["ğŸ›", "\\u{1F6E1}\\uFE0F"],

  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã±", "ñ"],
  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã‘", "Ñ"],
  ["Â¿", "¿"],
  ["Â¡", "¡"]
];

for (const [bad, good] of replacements) {
  s = s.split(bad).join(good);
}

// Asegura textos críticos de la landing.
s = s.replace(/aria-label=\{open \? "Cerrar [^"]+" : "Abrir [^"]+"\}/g, 'aria-label={open ? "Cerrar menú" : "Abrir menú"}');
s = s.replace(/\{open \? "[^"]*" : "[^"]*"\}/g, '{open ? "\\u00D7" : "\\u2630"}');

s = s.replace(/Analizar mi certificado [^<"]+/g, "Analizar mi certificado \\u2192");
s = s.replace(/Analizar ahora [^<"]+/g, "Analizar ahora \\u2192");
s = s.replace(/Comprar informe completo [^<"]+/g, "Comprar informe completo \\u2192");
s = s.replace(/Obtener certificado [^<"]+/g, "Obtener certificado \\u2197");

s = s.replace(/<div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600\/20">[^<]*<\/div>/g, '<div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">\\u2713</div>');

s = s.replace(/<p className="text-sm font-black uppercase tracking-widest">[^<]*Resultado preliminar<\/p>/g, '<p className="text-sm font-black uppercase tracking-widest">\\u2713 Resultado preliminar</p>');

s = s.replace(/<div className="mb-3 text-4xl text-slate-400 transition group-hover:text-blue-600">[^<]*<\/div>/g, '<div className="mb-3 text-4xl text-slate-400 transition group-hover:text-blue-600">\\u2B06</div>');

s = s.replace(/<span className="text-slate-400">[^<]*<\/span>/g, '<span className="text-slate-400">\\u2304</span>');

s = s.replace(/<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">[^<]*<\/div>/g, '<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">\\u2713</div>');

s = s.replace(/<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">[^<]*<\/div>/g, '<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">\\u2713</div>');

// Footer roto.
s = s.replace(/>[^<]*\{new Date\(\)\.getFullYear\(\)\} Prescribe tu Multa/g, ">© {new Date().getFullYear()} Prescribe tu Multa");

// Guarda UTF-8 real.
fs.writeFileSync(file, s, "utf8");

const stillBad = s.match(/Ã|Â|â|ğŸ/g);
if (stillBad) {
  console.log("Aún quedan patrones rotos. Ejecuta Select-String para verlos.");
} else {
  console.log("OK: no quedan patrones mojibake básicos.");
}
