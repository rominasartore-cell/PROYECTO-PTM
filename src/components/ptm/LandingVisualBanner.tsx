import Image from "next/image";

export default function LandingVisualBanner() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-teal-50/40 p-5 shadow-lg shadow-blue-950/5 lg:grid-cols-[0.9fr_1.4fr] lg:p-8">
        <div className="space-y-4 px-1 sm:px-3">
          <p className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700 ring-1 ring-teal-100">
            Tecnología legal a tu servicio
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
            Análisis legal con apoyo tecnológico
          </h2>
          <p className="max-w-xl text-base leading-7 text-slate-700 sm:text-lg">
            Revisamos tu certificado, identificamos multas potencialmente prescritas y generamos documentos base cuando corresponde.
          </p>
          <div className="grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">Revisión de plazos</div>
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">Resultado preliminar</div>
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">Documentos base</div>
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">Proceso 100% online</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-blue-950/10 ring-1 ring-blue-100">
          <Image
            src="/images/ptm-landing-visual-section.png"
            alt="Análisis digital de certificado de multas de tránsito"
            width={1792}
            height={768}
            className="h-auto w-full object-cover"
            sizes="(max-width: 1024px) 100vw, 760px"
          />
        </div>
      </div>
    </section>
  );
}
