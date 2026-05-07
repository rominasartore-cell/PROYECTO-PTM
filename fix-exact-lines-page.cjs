const fs = require("fs");

const file = "src/app/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.copyFileSync(file, `${file}.bak-exact-lines-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// Reemplazos exactos que siguen apareciendo
s = s.split("SegÃºn").join("Según");
s = s.split("Obtún").join("Obtén");
s = s.split("envÃa").join("envía");
s = s.split("recibÃ").join("recibí");
s = s.split("Analizar mi certificado ?").join("Analizar mi certificado ?");

// Preguntas FAQ
s = s.split('q: "Qué hago si compré y no recibí el correo?"').join('q: "¿Qué hago si compré y no recibí el correo?"');
s = s.split('q: "Qué pasa después de presentar la solicitud?"').join('q: "¿Qué pasa después de presentar la solicitud?"');

// Ícono roto ?? de Obtén tu informe
s = s.split('{ icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }')
     .join('{ icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }');

// Por si el título todavía está como Obtún dentro del objeto
s = s.split('{ icon: "??", title: "Obtún tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }')
     .join('{ icon: "??", title: "Obtén tu informe", text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente." }');

// Limpieza de caracteres residuales
s = s.split("Ã").join("");
s = s.split("Â").join("");

fs.writeFileSync(file, s, "utf8");

console.log("OK: líneas exactas corregidas.");
