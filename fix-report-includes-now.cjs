const fs = require("fs");

const file = "src/app/page.tsx";

if (!fs.existsSync(file)) {
  console.error("No existe src/app/page.tsx");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, file + ".bak-before-reportincludes-final-" + stamp);

let s = fs.readFileSync(file, "utf8");

const start = s.indexOf("function ReportIncludes()");
const end = s.indexOf("function FAQ", start);

if (start === -1) {
  console.error("No se encontr? function ReportIncludes().");
  process.exit(1);
}

if (end === -1) {
  console.error("No se encontr? function FAQ despu?s de ReportIncludes().");
  process.exit(1);
}

const replacement = `function ReportIncludes() {
  const items = [
    "An\\u00e1lisis del certificado aportado",
    "Detalle de multas revisables",
    "Monto potencial asociado",
    "Borradores editables por tribunal",
    "Instrucciones b\\u00e1sicas de presentaci\\u00f3n",
    "Advertencias y alcance del servicio",
  ];

  return (
    <section id="servicio" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700">
              Informe completo
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Qu\\u00e9 recibe la persona que compra
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Un producto documental preparado con los antecedentes del certificado. No es representaci\\u00f3n judicial ni tramitaci\\u00f3n completa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  {"\\u2713"}
                </div>
                <p className="font-bold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

`;

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(file, s, "utf8");

console.log("OK: ReportIncludes reemplazado completo.");