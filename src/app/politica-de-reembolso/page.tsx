import InformationPageLayout from "@/components/ptm/InformationPageLayout";

export const metadata = {
  title: "Política de Reembolso | Prescribe tu Multa",
  description: "Política de reembolso y garantía de satisfacción de Prescribe tu Multa",
};

export default function PoliticaDeReembolso() {
  return (
    <InformationPageLayout
      title="Política de Reembolso"
      subtitle="Entendemos tu preocupación por hacer una compra segura"
    >
      <section>
        <h2 className="text-2xl font-black">Resumen de la Política</h2>
        <p className="mt-3 leading-relaxed">
          En Prescribe tu Multa nos comprometemos con la satisfacción del cliente. Sin embargo, debido a la naturaleza de nuestro servicio (producto informativo y referencial), aplicamos una política de reembolso específica.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">1. Entrega del Producto</h2>
        <p className="mt-3 leading-relaxed">
          El informe completo de análisis y borradores de escritos se entregan por correo electrónico dentro de 24 horas luego de realizar el pago y confirmar la transacción.
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>No se otorgan reembolsos una vez que el informe ha sido entregado.</strong>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">2. Problemas con la Entrega del Correo</h2>
        <p className="mt-3 leading-relaxed">
          Si has realizado el pago y confirmaste tu correo electrónico pero <strong>no has recibido el informe después de 24 horas</strong>, nos comprometemos a:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Reenviarte el documento de forma inmediata y gratuita.</li>
          <li>Proporcionar soporte técnico para resolver el problema.</li>
          <li>Enviar el documento en formato alternativo si es necesario.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Contáctanos a través del formulario de contacto si experimentas este problema.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">3. Cancelación Antes de la Entrega</h2>
        <p className="mt-3 leading-relaxed">
          Si necesitas cancelar tu compra <strong>antes</strong> de que el informe sea entregado, podremos evaluar tu caso de forma individual. La elegibilidad para un reembolso dependerá de:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>El tiempo transcurrido desde la compra.</li>
          <li>Si el análisis ya fue generado.</li>
          <li>La causa de la cancelación.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Para solicitar una cancelación, contáctanos inmediatamente a través del formulario de contacto.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">4. Limitaciones del Servicio</h2>
        <p className="mt-3 leading-relaxed">
          Recuerda que Prescribe tu Multa proporciona un servicio informativo y referencial. <strong>No se otorgan reembolsos por:</strong>
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Insatisfacción con la información o análisis entregado.</li>
          <li>Decisiones desfavorables del tribunal respecto a la prescripción de multas.</li>
          <li>No cumplir con los plazos de presentación de documentos (responsabilidad del usuario).</li>
          <li>Requisitos adicionales exigidos por el tribunal no especificados en el informe.</li>
          <li>Cambios en la legislación después de la entrega del análisis.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">5. Proceso de Solicitud de Reembolso</h2>
        <p className="mt-3 leading-relaxed">
          Si crees que calificas para un reembolso conforme a esta política:
        </p>
        <ol className="mt-3 space-y-2 list-decimal pl-6">
          <li>Accede a nuestro formulario de contacto.</li>
          <li>Proporciona tu email de compra y el ID de transacción (si tienes).</li>
          <li>Describe el motivo de tu solicitud de forma clara.</li>
          <li>Nuestro equipo evaluará tu caso dentro de 5 días hábiles.</li>
          <li>Te notificaremos el resultado y, si aplica, procederemos con el reembolso.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-black">6. Método de Reembolso</h2>
        <p className="mt-3 leading-relaxed">
          Los reembolsos aprobados se procesarán a través de la plataforma de pago original (Mercado Pago) dentro de 3 a 5 días hábiles. Verifícalo en tu cuenta de Mercado Pago.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">7. Cambios en esta Política</h2>
        <p className="mt-3 leading-relaxed">
          Prescribe tu Multa se reserva el derecho de modificar esta política de reembolso en cualquier momento. Los cambios serán notificados mediante correo o un aviso en el sitio.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">8. Contacto</h2>
        <p className="mt-3 leading-relaxed">
          Si tienes preguntas sobre nuestra política de reembolso, utiliza el formulario de contacto en nuestro sitio o contacta directamente con nuestro equipo de soporte.
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
