"use client";

const PRODUCT_PRICE_CLP = 9990;

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function scrollToUploadForm() {
  document.getElementById("upload-form")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function PricingCard() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="container">
        <div className="mb-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
            Producto
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">
            Análisis gratis, documentos completos si te sirve
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          <article className="card">
            <h3 className="mb-4 text-2xl font-black text-slate-950">
              Análisis preliminar
            </h3>
            <div className="mb-6 text-4xl font-black text-blue-700">
              Gratis
            </div>

            <ul className="mb-8 space-y-3 text-sm font-medium leading-6 text-slate-700">
              <li>✓ Lectura preliminar del certificado RMNP.</li>
              <li>✓ Cantidad de multas detectadas.</li>
              <li>✓ Multas potencialmente prescritas.</li>
              <li>✓ Monto referencial asociado.</li>
              <li className="text-slate-500">No incluye documentos finales.</li>
            </ul>

            <button
              type="button"
              onClick={scrollToUploadForm}
              className="button-secondary w-full"
            >
              Comenzar análisis
            </button>
          </article>

          <article className="card relative border-2 border-blue-700">
            <div className="absolute right-4 top-4 rounded-full bg-blue-700 px-3 py-1 text-sm font-black text-white">
              Recomendado
            </div>

            <h3 className="mb-4 mt-4 text-2xl font-black text-slate-950">
              Informe completo + borradores
            </h3>

            <div className="mb-2 text-4xl font-black text-blue-700">
              {formatCLP(PRODUCT_PRICE_CLP)}
            </div>
            <p className="mb-6 text-sm font-bold text-slate-600">
              Pago único. Disponible después del análisis.
            </p>

            <ul className="mb-8 space-y-3 text-sm font-medium leading-6 text-slate-700">
              <li>✓ Informe completo de análisis del certificado.</li>
              <li>✓ Detalle de multas potencialmente prescritas o vigentes.</li>
              <li>✓ Borrador editable de solicitud de prescripción.</li>
              <li>✓ Guía de tramitación personal paso a paso.</li>
              <li>✓ Advertencias y limitaciones del producto.</li>
            </ul>

            <button
              type="button"
              onClick={scrollToUploadForm}
              className="button-primary w-full"
            >
              Analizar para comprar
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

export default PricingCard;
