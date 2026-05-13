import InformationPageLayout from "@/components/ptm/InformationPageLayout";

export const metadata = {
  title: "Contacto | Prescribe tu Multa",
  description: "Contacta con nosotros para soporte, preguntas o sugerencias",
};

export default function Contacto() {
  return (
    <InformationPageLayout
      title="Contacto"
      subtitle="Estamos aquí para ayudarte"
    >
      <section>
        <h2 className="text-2xl font-black">¿Cómo Podemos Ayudarte?</h2>
        <p className="mt-3 leading-relaxed">
          En Prescribe tu Multa valoramos tu retroalimentación y preguntas. Ya sea que necesites soporte técnico, tengas dudas sobre nuestro servicio, o desees sugerir mejoras, estaremos encantados de escucharte.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">Formulario de Contacto</h2>
        <p className="mt-3 leading-relaxed">
          Completa el formulario a continuación y nos pondremos en contacto contigo lo antes posible. Responderemos dentro de 24 a 48 horas hábiles.
        </p>

        <div className="mt-6 rounded-3xl border-2 border-blue-200 bg-blue-50 p-6">
          <form className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-black text-slate-900">
                Nombre completo *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                placeholder="Tu nombre"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-black text-slate-900">
                Correo electrónico *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="tu@correo.com"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="asunto" className="block text-sm font-black text-slate-900">
                Asunto *
              </label>
              <input
                type="text"
                id="asunto"
                name="asunto"
                required
                placeholder="¿Cuál es tu consulta?"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="mensaje" className="block text-sm font-black text-slate-900">
                Mensaje *
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                required
                rows={6}
                placeholder="Cuéntanos más detalles..."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700"
            >
              Enviar Mensaje
            </button>
          </form>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Los campos marcados con * son obligatorios. Tu privacidad es importante para nosotros.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">Otros Canales de Contacto</h2>
        <p className="mt-3 leading-relaxed">
          Si prefieres contactarnos de otras formas:
        </p>
        <ul className="mt-3 space-y-3 list-disc pl-6">
          <li>
            <strong>Soporte por Correo:</strong> Usa el formulario anterior para reportar problemas técnicos o solicitar asistencia.
          </li>
          <li>
            <strong>Preguntas sobre tu Análisis:</strong> Si pagaste un análisis y tienes dudas, incluye tu email de compra en el mensaje.
          </li>
          <li>
            <strong>Solicitudes de Reembolso:</strong> Revisa nuestra <a href="/politica-de-reembolso" className="font-bold text-blue-600 hover:text-blue-700">Política de Reembolso</a> y contáctanos si crees que calificas.
          </li>
          <li>
            <strong>Derechos de Privacidad:</strong> Para ejercer tus derechos de acceso, rectificación o eliminación de datos, usa este formulario especificando tu solicitud.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">Tiempo de Respuesta</h2>
        <p className="mt-3 leading-relaxed">
          Nos esforzamos por responder todos los mensajes dentro de <strong>24 a 48 horas hábiles</strong> (lunes a viernes, excepto feriados). Durante fin de semana y feriados, responderemos al día hábil siguiente.
        </p>
        <p className="mt-3 leading-relaxed">
          Por favor, revisa tu bandeja de correo no deseado en caso de que nuestra respuesta llegue allí.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">Preguntas Frecuentes</h2>
        <p className="mt-3 leading-relaxed">
          Antes de contactarnos, te recomendamos revisar nuestras <a href="/#preguntas" className="font-bold text-blue-600 hover:text-blue-700">Preguntas Frecuentes</a> en la página principal, donde encontrarás respuestas a consultas comunes.
        </p>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-8">
        <p className="text-sm text-slate-600">
          Última actualización: {new Date().toLocaleDateString("es-CL")}
        </p>
      </section>
    </InformationPageLayout>
  );
}
