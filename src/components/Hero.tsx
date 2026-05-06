'use client';

export function Hero() {
  const scrollToForm = () => {
    document.getElementById('upload-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20">
      <div className="container text-center">
        <h2 className="text-5xl font-bold mb-6">Â¿Tienes multas prescritas?</h2>
        <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
          Carga tu certificado RMNP y descubre cuÃ¡les de tus multas de trÃ¡nsito podrÃ­an estar prescritas.
          Nuestro anÃ¡lisis automÃ¡tico te mostrarÃ¡ si puedes solicitar la cancelaciÃ³n.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={scrollToForm}
            className="bg-white text-blue-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition"
          >
            Analizar Ahora (Gratis)
          </button>
          <a
            href="#faq"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-blue-900 transition"
          >
            Aprender MÃ¡s
          </a>
        </div>
      </div>
    </section>
  );
}

