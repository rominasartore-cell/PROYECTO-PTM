import Image from "next/image";

const WHATSAPP_NUMBER = "56968506777";
const WHATSAPP_TEXT =
  "Hola, quiero contactar a Lex por multas de tránsito. Necesito revisar prescripción, regularización, certificado de multas o anotaciones en el Registro Nacional de Conductores.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

function WhatsAppButton({ label = "Escribir por WhatsApp" }: { label?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-700/25 transition hover:bg-slate-950"
    >
      {label} <span className="ml-2">→</span>
    </a>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">Contacto</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
              Contacto directo por WhatsApp
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
              Para revisar multas de tránsito, prescripciones, regularizaciones, certificados, pagos pendientes de actualización o anotaciones asociadas, escríbenos directamente por WhatsApp.
            </p>

            <div className="mt-8">
              <WhatsAppButton label="Iniciar revisión por WhatsApp" />
            </div>

            <div className="mt-8 rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm leading-7 text-teal-950">
              <p className="font-black">Importante</p>
              <p className="mt-2 font-semibold">
                En esta sección no mostramos correo electrónico. El canal de contacto habilitado es WhatsApp.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <Image
              src="/whatsapp-consulta.svg"
              alt="Contacto por WhatsApp"
              width={800}
              height={600}
              className="h-72 w-full object-cover"
            />
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-950">Revisión ordenada</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                Cuéntanos brevemente tu situación y envía los antecedentes disponibles. Antes de iniciar cualquier revisión se informa el valor, alcance y documentos necesarios.
              </p>
              <div className="mt-6">
                <WhatsAppButton label="Escribir por WhatsApp" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

