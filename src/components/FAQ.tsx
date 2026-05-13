"use client";

import { useState } from "react";

const faqs = [
  {
    question: "¿Qué es la prescripción de una multa?",
    answer:
      "La prescripción es un mecanismo legal que permite solicitar que una multa deje de ser exigible cuando ha transcurrido el plazo legal correspondiente. La decisión final siempre depende del tribunal competente.",
  },
  {
    question: "¿Cómo obtengo mi certificado de multas?",
    answer:
      "Puedes obtener el Certificado de Multas de Tránsito No Pagadas a través del Registro Civil o desde la ficha informativa de ChileAtiende. Luego debes subirlo en formato PDF para realizar el análisis preliminar.",
  },
  {
    question: "¿Prescribe tu Multa elimina mis multas?",
    answer:
      "No. Prescribe tu Multa entrega un análisis documental, un informe y borradores editables para solicitar la prescripción. La eliminación de multas depende exclusivamente del tribunal y/o del organismo correspondiente.",
  },
  {
    question: "¿El resultado está garantizado?",
    answer:
      "No. El informe identifica multas potencialmente prescritas según los antecedentes del certificado, pero no garantiza que el tribunal declare la prescripción ni que las multas sean eliminadas del registro.",
  },
  {
    question: "¿Cuánto cuesta el informe completo?",
    answer:
      "El informe completo cuesta $9.990 CLP, pago único. Incluye análisis del certificado, detalle de multas detectadas, borradores editables y guía de tramitación personal.",
  },
  {
    question: "¿Qué incluye el informe completo?",
    answer:
      "Incluye informe de análisis, detalle de multas potencialmente prescritas, borrador editable de solicitud de prescripción y guía de tramitación personal paso a paso.",
  },
  {
    question: "¿Incluye abogado o representación judicial?",
    answer:
      "No. El producto no incluye patrocinio, representación judicial, presentación de escritos ni seguimiento del expediente. Es un servicio documental para tramitación personal.",
  },
  {
    question: "¿Es seguro compartir mi certificado?",
    answer:
      "La información se usa para realizar el análisis y generar los documentos asociados al servicio. No vendemos tus datos personales ni los usamos para fines ajenos al producto contratado.",
  },
  {
    question: "¿Qué hago si compré y no recibí el correo?",
    answer:
      "Revisa spam, promociones o correo no deseado. Si no aparece, escríbenos a contacto@prescribetumulta.cl indicando tu nombre, correo, patente y código de solicitud si lo tienes.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-16">
      <div className="container max-w-3xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
            Dudas frecuentes
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;

            return (
              <article
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-black text-slate-900 transition hover:bg-amber-50"
                >
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-amber-700 transition ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </button>

                {isOpen ? (
                  <div
                    id={panelId}
                    className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-sm font-medium leading-7 text-slate-700"
                  >
                    {faq.answer}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
