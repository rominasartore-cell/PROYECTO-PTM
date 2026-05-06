'use client';

export function GetCertificateCard() {
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <h2 className="text-3xl font-bold mb-12 text-center">¿No tienes tu certificado?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <a
            href="https://registromueblesavirtual.registrocivil.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="card text-center hover:shadow-lg"
          >
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">Registro Civil Online</h3>
            <p className="text-gray-600 mb-4">Solicita tu certificado RMNP en el sitio oficial del Registro Civil</p>
            <span className="text-blue-600 font-semibold">Ir al sitio →</span>
          </a>
          <a
            href="https://www.chileatiende.gob.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="card text-center hover:shadow-lg"
          >
            <div className="text-5xl mb-4">🏛️</div>
            <h3 className="text-xl font-bold mb-2">ChileAtiende</h3>
            <p className="text-gray-600 mb-4">Obtén tu certificado a través del portal oficial de trámites de Chile</p>
            <span className="text-blue-600 font-semibold">Ir al sitio →</span>
          </a>
        </div>
      </div>
    </section>
  );
}
