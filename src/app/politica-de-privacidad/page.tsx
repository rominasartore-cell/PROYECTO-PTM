export default function PoliticaDePrivacidadPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-700">
          Prescribe tu Multa
        </p>

        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Política de Privacidad
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <p>
            Prescribe tu Multa recopila los datos entregados por el usuario, tales como nombre, correo electrónico, patente y certificado PDF, con la finalidad de realizar el análisis solicitado y generar los documentos asociados al servicio.
          </p>

          <p>
            La información se utiliza únicamente para procesar la solicitud, entregar el resultado preliminar, gestionar la compra y enviar los documentos contratados.
          </p>

          <p>
            No vendemos datos personales ni los usamos para fines ajenos al servicio contratado.
          </p>

          <p>
            El usuario debe evitar subir documentos que no sean necesarios para el análisis de multas de tránsito no pagadas.
          </p>

          <p>
            Para consultas relacionadas con privacidad o uso de datos, el usuario puede contactar al canal de soporte informado en la página de contacto.
          </p>
        </div>

        <a href="/" className="mt-10 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Volver al inicio
        </a>
      </section>
    </main>
  );
}