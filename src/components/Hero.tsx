"use client";

export function Hero() {
  function scrollToForm() {
    document.getElementById("upload-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
      <div className="container text-center">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-teal-300">
          Análisis preliminar gratuito
        </p>

        <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
          Revisa si tus multas de tránsito podrían estar prescritas
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-lg font-medium leading-8 text-blue-100 sm:text-xl">
          Sube tu certificado RMNP en PDF y obtén un resultado preliminar. Si existen multas potencialmente prescritas, podrás comprar un informe completo con solicitudes editables para tramitación personal.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={scrollToForm}
            className="rounded-2xl bg-white px-8 py-4 font-black text-blue-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50"
          >
            Analizar certificado gratis
          </button>

          <a
            href="#faq"
            className="rounded-2xl border-2 border-white px-8 py-4 font-black text-white transition hover:bg-white hover:text-blue-950"
          >
            Ver preguntas frecuentes
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
