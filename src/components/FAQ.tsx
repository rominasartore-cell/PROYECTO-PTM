'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'Â¿QuÃ© es la prescripciÃ³n de una multa?',
    answer: 'La prescripciÃ³n es un mecanismo legal que extingue la obligaciÃ³n de pago despuÃ©s de cierto tiempo. En Chile, las multas de trÃ¡nsito prescriben despuÃ©s de 3 aÃ±os desde su ingreso al Registro de Multas No Pagadas (RMNP).',
  },
  {
    question: 'Â¿CÃ³mo obtengo mi certificado RMNP?',
    answer: 'Puedes obtener tu certificado en el Registro Civil o a travÃ©s del portal ChileAtiende. Busca "Certificado de Multas de TrÃ¡nsito No Pagadas" y sigue el proceso online.',
  },
  {
    question: 'Â¿Es este anÃ¡lisis vinculante?',
    answer: 'No. Este anÃ¡lisis es informativo y preliminar. La decisiÃ³n final sobre prescripciÃ³n corresponde exclusivamente al tribunal. Te recomendamos consultar con un abogado antes de presentar cualquier solicitud.',
  },
  {
    question: 'Â¿CuÃ¡nto cuesta el informe completo?',
    answer: 'El informe completo cuesta $49,900 (pago Ãºnico). Incluye documentos legales listos para presentar en tribunal segÃºn las multas prescritas que encuentres.',
  },
  {
    question: 'Â¿QuÃ© incluye el informe completo?',
    answer: 'El informe incluye: anÃ¡lisis detallado en HTML/PDF, solicitudes de prescripciÃ³n personalizadas por tribunal, y toda la documentaciÃ³n necesaria para presentar en juzgados.',
  },
  {
    question: 'Â¿Es seguro compartir mi certificado?',
    answer: 'SÃ­. Tu certificado se procesa localmente y se elimina despuÃ©s del anÃ¡lisis. No compartimos datos con terceros. Consulta nuestra polÃ­tica de privacidad para mÃ¡s detalles.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 bg-white">
      <div className="container max-w-3xl">
        <h2 className="text-3xl font-bold mb-12 text-center">Preguntas Frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center"
              >
                {faq.question}
                <span className={`transform transition ${openIndex === index ? 'rotate-180' : ''}`}>
                  â–¼
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-gray-50 border-t text-gray-700">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

