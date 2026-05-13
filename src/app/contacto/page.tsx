export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-teal-700">
          Prescribe tu Multa
        </p>

        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Contacto
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <p>
            Para consultas sobre una compra, problemas con el correo de entrega o dudas sobre el servicio, escribe indicando tu nombre, correo utilizado en la compra y patente analizada.
          </p>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Correo de soporte
            </p>
            <p className="mt-2 font-black text-slate-950">
              contacto@prescribetumulta.cl
            </p>
          </div>

          <p>
            Antes de contactar, revisa también las carpetas de spam, promociones o correo no deseado.
          </p>
        </div>

        <a href="/" className="mt-10 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Volver al inicio
        </a>
      </section>
    </main>
  );
}