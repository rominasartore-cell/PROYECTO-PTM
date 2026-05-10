import Link from "next/link";
import PublicSiteHeader from "@/components/ptm/PublicSiteHeader";
import PurchaseEmailNotice from "@/components/ptm/PurchaseEmailNotice";

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
  searchParams?: Promise<{
    mock?: string;
    status?: string;
    email?: string;
    correo?: string;
  }>;
};

function normalizeStatus(status?: string) {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  return "approved";
}

function decodeValue(value?: string) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ResultadosPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const requestId = resolvedParams.requestId;
  const status = normalizeStatus(resolvedSearchParams.status);
  const isMock = resolvedSearchParams.mock === "true";

  const customerEmail = decodeValue(
    resolvedSearchParams.email ?? resolvedSearchParams.correo
  );

  return (
    <>
      <PublicSiteHeader />

      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-700 shadow-sm">
              Compra confirmada
            </div>

            <h1 className="text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Tu compra ha sido procesada con éxito
            </h1>

            <p className="mt-6 max-w-5xl text-left text-lg font-semibold leading-8 text-slate-600 sm:text-xl">
              Dentro de las próximas 24 horas recibirás tu informe, borradores de escritos y guía de tramitación personal en el correo electrónico asociado a tu compra.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-black text-slate-600">
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                ✓ Pago procesado
              </span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                ✓ Producto en preparación
              </span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                ✓ Entrega por correo
              </span>

              {isMock ? (
                <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700 shadow-sm">
                  Modo prueba
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
            <div className="bg-gradient-to-br from-emerald-600 via-cyan-700 to-blue-700 px-7 py-9 text-white sm:px-10">
              <p className="mb-6 text-sm font-black tracking-[0.18em] text-white/90">
                RESULTADO DE LA COMPRA
              </p>

              <h2 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
                Producto solicitado correctamente
              </h2>

              <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/90 sm:text-xl">
                Estamos preparando tus documentos para enviarlos al correo asociado a la compra.
              </p>
            </div>

            <div className="space-y-5 p-6 sm:p-8">
              <PurchaseEmailNotice
                requestId={requestId}
                initialEmail={customerEmail}
              />

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-3xl">📄</p>
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    Informe completo
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Análisis del certificado y estado de las multas revisadas.
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-3xl">⚖️</p>
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    Borradores de escritos
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Formato editable para solicitar la prescripción personalmente.
                  </p>
                </div>

                <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
                  <p className="text-3xl">🧭</p>
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    Guía paso a paso
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Instrucciones simples para realizar la tramitación personal.
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-lg font-black text-amber-900">
                  Importante
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/80">
                  Si no recibes el correo dentro del plazo indicado, revisa primero tu carpeta de spam, promociones o correo no deseado.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">
                  Soporte de entrega
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Si después de revisar spam no encuentras el correo, contáctanos indicando tu número de solicitud:
                </p>

                <p className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                  {requestId}
                </p>
              </section>

              {status !== "approved" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  El estado del pago no figura como aprobado. Si pagaste correctamente, revisa tu correo o contacta soporte.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/"
                  className="rounded-2xl border border-blue-200 bg-white px-5 py-4 text-center text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  Volver al inicio
                </Link>

                <Link
                  href="/#analizar"
                  className="rounded-2xl bg-blue-600 px-5 py-4 text-center text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  Analizar otro certificado
                </Link>
              </div>

              <p className="text-center text-xs leading-5 text-slate-500">
                Producto informativo y referencial. No constituye patrocinio, representación judicial ni garantía de resultado ante el Tribunal.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
