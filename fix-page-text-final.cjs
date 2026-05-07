const fs = require("fs");

const file = "src/app/page.tsx";

if (!fs.existsSync(file)) {
  console.error("No existe src/app/page.tsx");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-text-final-${stamp}`);

let s = fs.readFileSync(file, "utf8");

function rep(bad, good) {
  s = s.split(bad).join(good);
}

// Palabras rotas frecuentes
const fixes = [
  ["Juan P\u00C3rez", "Juan P\u00E9rez"],
  ["C\u00C3\u00B3mo funciona", "C\u00F3mo funciona"],
  ["C\u00C3mo funciona", "C\u00F3mo funciona"],
  ["Navegaci\u00C3\u00B3n principal", "Navegaci\u00F3n principal"],
  ["Navegaci\u00C3n principal", "Navegaci\u00F3n principal"],
  ["M\u00C3x.", "M\u00E1x."],
  ["M\u00C3\u00A1x.", "M\u00E1x."],
  ["\u00C2No tienes", "\u00BFNo tienes"],
  ["aqu\u00C3\u00AD", "aqu\u00ED"],
  ["aqu\u00C3", "aqu\u00ED"],
  ["devolvi\u00C3\u00B3", "devolvi\u00F3"],
  ["devolvi\u00C3", "devolvi\u00F3"],
  ["Ocurri\u00C3\u00B3", "Ocurri\u00F3"],
  ["Ocurri\u00C3", "Ocurri\u00F3"],
  ["An\u00C3lisis", "An\u00E1lisis"],
  ["an\u00C3lisis", "an\u00E1lisis"],
  ["podr\u00C3\u00ADan", "podr\u00EDan"],
  ["podr\u00C3an", "podr\u00EDan"],
  ["podr\u00C3\u00ADas", "podr\u00EDas"],
  ["podr\u00C3as", "podr\u00EDas"],
  ["Podr\u00C3\u00ADas", "Podr\u00EDas"],
  ["Podr\u00C3as", "Podr\u00EDas"],
  ["prescripci\u00C3\u00B3n", "prescripci\u00F3n"],
  ["prescripci\u00C3n", "prescripci\u00F3n"],
  ["representaci\u00C3\u00B3n", "representaci\u00F3n"],
  ["representaci\u00C3n", "representaci\u00F3n"],
  ["presentaci\u00C3\u00B3n", "presentaci\u00F3n"],
  ["presentaci\u00C3n", "presentaci\u00F3n"],
  ["garant\u00C3\u00ADa", "garant\u00EDa"],
  ["garant\u00C3a", "garant\u00EDa"],
  ["informaci\u00C3\u00B3n", "informaci\u00F3n"],
  ["informaci\u00C3n", "informaci\u00F3n"],
  ["seg\u00C3\u00BAn", "seg\u00FAn"],
  ["seg\u00C3n", "seg\u00FAn"],
  ["Tramitaci\u00C3\u00B3n", "Tramitaci\u00F3n"],
  ["Tramitaci\u00C3n", "Tramitaci\u00F3n"],
  ["tramitaci\u00C3\u00B3n", "tramitaci\u00F3n"],
  ["tramitaci\u00C3n", "tramitaci\u00F3n"],
  ["rec\u00C3\u00ADbelo", "rec\u00EDbelo"],
  ["rec\u00C3belo", "rec\u00EDbelo"],
  ["recibi\u00C3\u00B3", "recibi\u00F3"],
  ["recibi\u00C3", "recibi\u00F3"],
  ["b\u00C3\u00A1sicas", "b\u00E1sicas"],
  ["b\u00C3sicas", "b\u00E1sicas"],
  ["b\u00C3\u00A1sico", "b\u00E1sico"],
  ["b\u00C3sico", "b\u00E1sico"],
  ["eliminaci\u00C3\u00B3n", "eliminaci\u00F3n"],
  ["eliminaci\u00C3n", "eliminaci\u00F3n"],
  ["extinci\u00C3\u00B3n", "extinci\u00F3n"],
  ["extinci\u00C3n", "extinci\u00F3n"],
  ["declaraci\u00C3\u00B3n", "declaraci\u00F3n"],
  ["declaraci\u00C3n", "declaraci\u00F3n"],
  ["decisi\u00C3\u00B3n", "decisi\u00F3n"],
  ["decisi\u00C3n", "decisi\u00F3n"],
  ["despu\u00C3\u00A9s", "despu\u00E9s"],
  ["despu\u00C3s", "despu\u00E9s"],
  ["extra\u00C3\u00ADdos", "extra\u00EDdos"],
  ["extr\u00C3\u00ADdos", "extra\u00EDdos"],
  ["extra\u00C3dos", "extra\u00EDdos"],
  ["Revisi\u00C3\u00B3n", "Revisi\u00F3n"],
  ["Revisi\u00C3n", "Revisi\u00F3n"],
  ["Tram\u00C3\u00ADtalo", "Tram\u00EDtalo"],
  ["Tram\u00C3talo", "Tram\u00EDtalo"],
  ["t\u00C3\u00BA", "t\u00FA"],
  ["t\u00C3", "t\u00FA"],
  ["Obt\u00C3\u00A9n", "Obt\u00E9n"],
  ["Obt\u00C3n", "Obt\u00E9n"],
  ["jur\u00C3\u00ADdico", "jur\u00EDdico"],
  ["jur\u00C3dico", "jur\u00EDdico"],
  ["l\u00C3\u00ADnea", "l\u00EDnea"],
  ["l\u00C3nea", "l\u00EDnea"],
  ["tr\u00C3\u00A1nsito", "tr\u00E1nsito"],
  ["tr\u00C3nsito", "tr\u00E1nsito"],
  ["electr\u00C3\u00B3nico", "electr\u00F3nico"],
  ["electr\u00C3nico", "electr\u00F3nico"],
  ["dise\u00C3\u00B1ado", "dise\u00F1ado"],
  ["dise\u00C3ado", "dise\u00F1ado"],
  ["est\u00C3\u00A1", "est\u00E1"],
  ["est\u00C3", "est\u00E1"],
  ["habr\u00C3\u00A1", "habr\u00E1"],
  ["habr\u00C3", "habr\u00E1"],
  ["recepci\u00C3\u00B3n", "recepci\u00F3n"],
  ["recepci\u00C3n", "recepci\u00F3n"],
  ["asesor\u00C3\u00ADa", "asesor\u00EDa"],
  ["asesor\u00C3a", "asesor\u00EDa"],
  ["env\u00C3\u00ADan", "env\u00EDan"],
  ["env\u00C3an", "env\u00EDan"],
  ["tambi\u00C3\u00A9n", "tambi\u00E9n"],
  ["tambi\u00C3n", "tambi\u00E9n"],
  ["compr\u00C3\u00A9", "compr\u00E9"],
  ["compr\u00C3", "compr\u00E9"],
  ["podr\u00C3\u00A1s", "podr\u00E1s"],
  ["podr\u00C3s", "podr\u00E1s"],
  ["reenv\u00C3\u00ADo", "reenv\u00EDo"],
  ["reenv\u00C3o", "reenv\u00EDo"],
  ["r\u00C3\u00A1pidas", "r\u00E1pidas"],
  ["r\u00C3pidas", "r\u00E1pidas"],
  ["tr\u00C3\u00A1mite", "tr\u00E1mite"],
  ["tr\u00C3mite", "tr\u00E1mite"],
  ["Cu\u00C3\u00A1ndo", "Cu\u00E1ndo"],
  ["Cu\u00C3ndo", "Cu\u00E1ndo"],
  ["Qu\u00C3\u00A9", "Qu\u00E9"],
  ["Qu\u00C3", "Qu\u00E9"],
  ["Lo b\u00C3sico", "Lo b\u00E1sico"],
  ["Monto despu\u00C3s", "Monto despu\u00E9s"],
  ["\u00C2El servicio", "\u00BFEl servicio"],
  ["\u00C2Incluye", "\u00BFIncluye"],
  ["\u00C2Sirve", "\u00BFSirve"],
  ["\u00C2Cu\u00C3ndo", "\u00BFCu\u00E1ndo"],
  ["\u00C2Qu\u00C3", "\u00BFQu\u00E9"],
  ["\u00C2C\u00C3\u00B3mo", "\u00BFC\u00F3mo"],
  ["\u00C2C\u00C3mo", "\u00BFC\u00F3mo"],
  ["\u00C2", ""]
];

for (const [bad, good] of fixes) rep(bad, good);

// Arreglar secuencias literales que quedaron como \u2192 visibles
rep("\\u2192", "\u2192");
rep("\\u2197", "\u2197");
rep("\\u2713", "\u2713");
rep("\\u2304", "\u2304");
rep("\\u2B06", "\u2B06");
rep("\\u2696", "\u2696");

// Reemplazos estructurales de iconos rotos
s = s.replace(/<IconBubble tone="emerald">.*?<\/IconBubble>/, '<IconBubble tone="emerald">{"\\u{1F4B0}"}</IconBubble>');
s = s.replace(/<IconBubble>.*?<\/IconBubble>/, '<IconBubble>{"\\u{1F4C4}"}</IconBubble>');

s = s.replace(
  /\{ icon: "[^"]*", title: "Sube tu certificado"/,
  '{ icon: "\\u2B06", title: "Sube tu certificado"'
);

s = s.replace(
  /\{ icon: "[^"]*", title: "Analizamos los antecedentes"/,
  '{ icon: "\\u{1F50E}", title: "Analizamos los antecedentes"'
);

s = s.replace(
  /\{ icon: "[^"]*", title: "Obt\u00E9n tu informe"/,
  '{ icon: "\\u{1F4E9}", title: "Obt\u00E9n tu informe"'
);

s = s.replace(
  /\{ icon: "[^"]*", title: "Procedimiento confiable"/,
  '{ icon: "\\u{1F6E1}\\uFE0F", title: "Procedimiento confiable"'
);

s = s.replace(
  /\{ icon: "[^"]*", title: "Respaldo jur\u00EDdico profesional"/,
  '{ icon: "\\u2696", title: "Respaldo jur\u00EDdico profesional"'
);

s = s.replace(
  /\{ icon: "[^"]*", title: "Soporte solo de compra"/,
  '{ icon: "\\u{1F512}", title: "Soporte solo de compra"'
);

// Botones/flechas/checks
s = s.replace(/Analizar mi certificado\s+[^<"]+/g, "Analizar mi certificado ?");
s = s.replace(/Analizar ahora\s+[^<"]+/g, "Analizar ahora ?");
s = s.replace(/Comprar informe completo\s+[^<"]+/g, "Comprar informe completo ?");
s = s.replace(/Obtener certificado\s+[^<"]+/g, "Obtener certificado ?");

s = s.replace(/>[^<]* Resultado preliminar<\/p>/g, ">? Resultado preliminar</p>");
s = s.replace(/>[^<]* Multas de tr/g, ">? Multas de tr");

// Preguntas críticas completas
s = s.replace('title="C\u00B3mo funciona?"', 'title="\u00BFC\u00F3mo funciona?"');
s = s.replace('title="C\u00F3mo funciona?"', 'title="\u00BFC\u00F3mo funciona?"');
s = s.replace('title="\u00BFC\u00F3mo funciona?"', 'title="\u00BFC\u00F3mo funciona?"');

// Footer
s = s.replace(/>\s*\{new Date\(\)\.getFullYear\(\)\} Prescribe tu Multa/g, ">© {new Date().getFullYear()} Prescribe tu Multa");
s = s.replace(/>© © \{new Date\(\)\.getFullYear\(\)\}/g, ">© {new Date().getFullYear()}");

// Limpieza final de patrones obvios
s = s.replace(/\u00C2/g, "");
s = s.replace(/\u00EF\u00BF\u00BD/g, "");

fs.writeFileSync(file, s, "utf8");

console.log("Archivo limpiado. Revisando patrones restantes...");
const remaining = s.match(/[\u00C2\u00C3\u00E2\u00F0]/g);
if (remaining) {
  console.log("Quedan posibles caracteres rotos:", [...new Set(remaining)].join(" "));
} else {
  console.log("OK sin patrones mojibake básicos.");
}
