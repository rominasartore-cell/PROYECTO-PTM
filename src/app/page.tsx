import Image from "next/image";

const WHATSAPP_NUMBER = "56968506777";
const WHATSAPP_TEXT =
  "Hola, quiero contactar a Lex por multas de tránsito, certificado de multas no pagadas o anotaciones en el Registro Nacional de Conductores. Necesito revisión.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
const REGISTRO_CIVIL_URL = "https://www.registrocivil.cl/";

const items = [
  "Revisión de multas de tránsito en general.",
  "Revisión del Certificado de Multas de Tránsito No Pagadas.",
  "Revisión de anotaciones vigentes en el Registro Nacional de Conductores.",
  "Orientación sobre multas antiguas.",
  "Regularización de multas pagadas que siguen figurando.",
  "Revisión de convenios municipales.",
  "Preparación de solicitudes simples, si corresponde.",
  "Instrucciones para continuar la gestión ante el organismo correspondiente.",
];

function WhatsAppButton({ label = "Contactar por WhatsApp" }: { label?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-700/25 transition hover:bg-slate-950 sm:w-auto"
    >
      {label} <span className="ml-2">→</span>
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center">
          <Image
            src="/logo-prescribe-tu-multa.png"
            alt="Prescribe tu Multa"
            width={260}
            height={99}
            priority
            className="h-12 w-auto object-contain sm:h-14"
          />
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          <a href="#servicio" className="text-sm font-black text-slate-700 transition hover:text-emerald-700">
            Servicio
          </a>
          <a href="#funciona" className="text-sm font-black text-slate-700 transition hover:text-emerald-700">
            Cómo funciona
          </a>
          <a href="/contacto" className="text-sm font-black text-slate-700 transition hover:text-emerald-700">
            Contacto
          </a>
        </nav>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/25 transition hover:from-slate-950 hover:to-slate-950 sm:inline-flex"
        >
          WhatsApp Lex
        </a>
      </div>
    </header>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="absolute right-[-12rem] top-[-10rem] hidden h-[32rem] w-[32rem] rounded-full bg-emerald-200/30 blur-3xl lg:block" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
              <span className="text-emerald-700">⚖</span>
              Servicio para multas de tránsito en Chile
            </div>

            <h1 className="mt-7 max-w-5xl text-4xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
              Contacta a Lex para revisar multas de tránsito, certificados y anotaciones
            </h1>

            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-700 sm:text-xl">
              Si tienes multas de tránsito en general, multas antiguas, multas pagadas que siguen apareciendo, problemas con el Certificado de Multas No Pagadas o anotaciones en el Registro Nacional de Conductores, escríbenos por WhatsApp para coordinar la revisión de antecedentes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WhatsAppButton label="Contactar a Lex por WhatsApp" />
              <a
                href={REGISTRO_CIVIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto"
              >
                Obtener certificado <span className="ml-2">↗</span>
              </a>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-slate-500">
              La revisión individual del caso es pagada. El valor y alcance se informan antes de iniciar el análisis.
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-2xl shadow-emerald-950/15 ring-1 ring-emerald-100">
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
              Inicio directo
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Envía tu certificado por WhatsApp
            </h2>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
              Para revisar tu situación necesitamos el Certificado de Multas de Tránsito No Pagadas, antecedentes sobre multas de tránsito y, si corresponde, información sobre anotaciones en el Registro Nacional de Conductores.
            </p>

            <div className="mt-6 rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm leading-7 text-teal-950">
              <p className="font-black">Mensaje sugerido</p>
              <p className="mt-2 font-semibold">
                “Hola, quiero contactar a Lex por multas de tránsito, certificado de multas no pagadas o anotaciones en el Registro Nacional de Conductores. Necesito revisión.”
              </p>
            </div>

            <div className="mt-6">
              <WhatsAppButton label="Escribir a Lex" />
            </div>
          </div>
        </div>
      </section>

      <section id="servicio" className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
              Servicio
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Revisión y gestión de multas de tránsito
            </h2>

            <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
              El servicio se inicia por contacto directo. No se publican precios en la página: el valor se informa antes de comenzar la revisión o cualquier gestión adicional.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item} className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
                  ✓
                </div>
                <p className="font-bold leading-6 text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="funciona" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Cómo funciona
          </p>

          <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Contacto directo, certificado y revisión previa
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                1
              </span>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                Escribe por WhatsApp
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                Inicia el contacto directo con Lex.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                2
              </span>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                Envía antecedentes
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                Comparte tu certificado y documentos relacionados.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                3
              </span>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                Recibe indicación de alcance
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                Antes de revisar se informa valor, alcance y documentos necesarios.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
              Contacto
            </p>

            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              ¿Tienes multas antiguas o problemas de actualización?
            </h2>

            <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              Escríbenos por WhatsApp y coordina la revisión de tu certificado.
            </p>
          </div>

          <WhatsAppButton label="Escribir a Lex ahora" />
        </div>
      </section>

      <footer className="bg-white py-10 text-slate-600">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-lg font-black text-slate-950">Prescribe tu Multa</p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                Servicio de orientación y gestión para multas de tránsito, prescripciones, regularizaciones, certificados y anotaciones asociadas. Atención directa por WhatsApp de Lex.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm font-bold md:justify-end">
              <a href="/terminos-y-condiciones" className="hover:text-emerald-700">
                Términos
              </a>
              <a href="/politica-de-privacidad" className="hover:text-emerald-700">
                Privacidad
              </a>
              <a href="/contacto" className="hover:text-emerald-700">
                Contacto
              </a>
            </div>
          </div>

          <p className="mt-8 text-xs font-semibold text-slate-400">
            © {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}





