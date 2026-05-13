"use client";

const CERTIFICATE_LINKS = [
  {
    title: "Ficha ChileAtiende",
    description:
      "Revisa instrucciones oficiales para solicitar el Certificado de Multas de Tránsito No Pagadas.",
    href: "https://www.chileatiende.gob.cl/fichas/3439-certificado-de-multas-de-transito-no-pagadas",
    icon: "📋",
  },
  {
    title: "Registro Civil",
    description:
      "Ingresa al sitio del Registro Civil y busca la sección Vehículos / Certificado vehículos de multas.",
    href: "https://www.registrocivil.cl/principal/servicios-en-linea",
    icon: "🏛️",
  },
];

export function GetCertificateCard() {
  return (
    <section className="bg-white py-16">
      <div className="container">
        <div className="mb-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
            Paso previo
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">
            ¿No tienes tu certificado?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Necesitas el Certificado de Multas de Tránsito No Pagadas en PDF para que el sistema pueda analizarlo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {CERTIFICATE_LINKS.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card text-center transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="mb-4 text-5xl" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="mb-2 text-xl font-black text-slate-950">
                {item.title}
              </h3>
              <p className="mb-4 text-sm font-medium leading-6 text-slate-600">
                {item.description}
              </p>
              <span className="font-black text-emerald-700">Ir al sitio →</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GetCertificateCard;
