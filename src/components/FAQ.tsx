'use client';

import { useState } from 'react';

const faqs = [
  {
    question: '¿Qué es la prescripción de una multa?',
    answer: 'La prescripción es un mecanismo legal que extingue la obligación de pago después de cierto tiempo. En Chile, las multas de tránsito prescriben después de 3 años desde su ingreso al Registro de Multas No Pagadas (RMNP).',
  },
  {
    question: '¿Cómo obtengo mi certificado RMNP?',
    answer: 'Puedes obtener tu certificado en el Registro Civil o a través del portal ChileAtiende. Busca "Certificado de Multas de Tránsito No Pagadas" y sigue el proceso online.',
  },
  {
    question: '¿Es este análisis vinculante?',
    answer: 'No. Este análisis es informativo y preliminar. La decisión final sobre prescripción corresponde exclusivamente al tribunal. Te recomendamos consultar con un abogado antes de presentar cualquier solicitud.',
  },
  {
    question: '¿Cuánto cuesta el informe completo?',
    answer: 'El informe completo cuesta $49,900 (pago único). Incluye documentos legales listos para presentar en tribunal según las multas prescritas que encuentres.',
  },
  {
    question: '¿Qué incluye el informe completo?',
    answer: 'El informe incluye: análisis detallado en HTML/PDF, solicitudes de prescripción personalizadas por tribunal, y toda la documentación necesaria para presentar en juzgados.',
  },
  {
    question: '¿Es seguro compartir mi certificado?',
    answer: 'Sí. Tu certificado se procesa localmente y se elimina después del análisis. No compartimos datos con terceros. Consulta nuestra política de privacidad para más detalles.',
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
                  ▼
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

