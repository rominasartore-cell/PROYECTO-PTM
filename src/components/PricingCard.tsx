'use client';

export function PricingCard() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <h2 className="text-3xl font-bold mb-12 text-center">Planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="card">
            <h3 className="text-2xl font-bold mb-4">AnÃ¡lisis Preliminar</h3>
            <div className="text-4xl font-bold text-blue-600 mb-6">Gratis</div>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>AnÃ¡lisis automÃ¡tico de prescripciÃ³n</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Resultados preliminares</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Resumen de multas prescritas</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âŒ</span>
                <span className="text-gray-500">Documentos legales</span>
              </li>
            </ul>
            <button className="w-full button-secondary">Comenzar AnÃ¡lisis</button>
          </div>

          {/* Paid Tier */}
          <div className="card border-2 border-blue-600 relative">
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Popular
            </div>
            <h3 className="text-2xl font-bold mb-4 mt-4">Informe Completo</h3>
            <div className="text-4xl font-bold text-blue-600 mb-2">$49,900</div>
            <p className="text-gray-600 mb-6 text-sm">Ãšnico pago</p>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>AnÃ¡lisis automÃ¡tico de prescripciÃ³n</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Resultados preliminares</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Informe detallado en PDF</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Solicitudes por tribunal</span>
              </li>
              <li className="flex items-start gap-3">
                <span>âœ…</span>
                <span>Listo para presentar</span>
              </li>
            </ul>
            <button className="w-full button-primary">Comprar Ahora</button>
          </div>
        </div>
      </div>
    </section>
  );
}

