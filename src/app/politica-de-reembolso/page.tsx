export default function PoliticaDeReembolsoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-teal-700">
          Prescribe tu Multa
        </p>

        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Política de Reembolso
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <p>
            El producto consiste en un informe documental y solicitudes editables generados a partir del certificado aportado por el usuario.
          </p>

          <p>
            Una vez enviado el informe o generados los documentos asociados a la compra, el servicio se considera prestado.
          </p>

          <p>
            Podrán revisarse solicitudes de reembolso cuando exista duplicidad de pago, error técnico atribuible al sistema o falta total de entrega del producto contratado.
          </p>

          <p>
            No procede reembolso por disconformidad con el resultado jurídico estimado, por rechazo posterior del tribunal o por decisiones adoptadas por organismos externos.
          </p>

          <p>
            Para solicitar revisión, el usuario debe contactar soporte indicando nombre, correo, patente y comprobante de pago.
          </p>
        </div>

        <a href="/" className="mt-10 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Volver al inicio
        </a>
      </section>
    </main>
  );
}