import InformationPageLayout from "@/components/ptm/InformationPageLayout";

export const metadata = {
  title: "Términos y Condiciones | Prescribe tu Multa",
  description: "Términos y condiciones de uso del servicio Prescribe tu Multa",
};

export default function TerminosYCondiciones() {
  return (
    <InformationPageLayout
      title="Términos y Condiciones"
      subtitle="Conoce las reglas de uso de nuestro servicio"
    >
      <section>
        <h2 className="text-2xl font-black">1. Descripción del Servicio</h2>
        <p className="mt-3 leading-relaxed">
          Prescribe tu Multa es un servicio documental automatizado que analiza certificados de multas de transito no pagadas informadas al Registro de Multas No Pagadas (RMNP). El servicio genera un informe preliminar de análisis y borradores de escritos editables para solicitar prescripción de multas.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">2. Limitaciones del Servicio</h2>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>El servicio NO garantiza que el tribunal declare la prescripción.</li>
          <li>El servicio NO garantiza la eliminación de multas del RMNP.</li>
          <li>El servicio NO incluye representación judicial, patrocinio profesional ni presentación de escritos ante tribunales.</li>
          <li>El servicio se basa únicamente en el certificado aportado por el usuario.</li>
          <li>Los escritos se entregan en formato tipo; cada tribunal puede exigir formalidades adicionales.</li>
          <li>La responsabilidad de completar y presentar los documentos corresponde al usuario.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">3. Consentimiento del Usuario</h2>
        <p className="mt-3 leading-relaxed">
          Al usar este servicio, el usuario consiente:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>El tratamiento de sus datos personales (nombre, correo, patente) para realizar el análisis del certificado.</li>
          <li>La generación y envío del informe al correo indicado.</li>
          <li>Que el servicio es informativo y referencial, sin garantía de resultado.</li>
          <li>Que el usuario es responsable de todas las acciones posteriores al recibir el informe.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">4. Política de Reembolso</h2>
        <p className="mt-3 leading-relaxed">
          No se otorgan reembolsos una vez que el informe ha sido entregado. En caso de problemas con la entrega del correo (pago confirmado y correo no recibido), se ofrecerá el reenvío del documento de forma gratuita.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">5. Responsabilidad</h2>
        <p className="mt-3 leading-relaxed">
          El usuario entiende y acepta que Prescribe tu Multa no se responsabiliza por:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Las decisiones judiciales que pudiera tomar un tribunal.</li>
          <li>La falta de presentación oportuna de los documentos por parte del usuario.</li>
          <li>Errores en la tramitación o presentación de documentos.</li>
          <li>Cualquier consecuencia legal o financiera derivada del uso del servicio.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">6. Protección de Datos</h2>
        <p className="mt-3 leading-relaxed">
          Los datos personales del usuario serán utilizados únicamente para:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Realizar el análisis del certificado cargado.</li>
          <li>Generar el informe personalizado.</li>
          <li>Enviar el documento al correo indicado.</li>
          <li>Soporte de entrega en caso de inconvenientes.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Los datos no serán compartidos con terceros salvo que sea requerido por ley.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">7. Cambios en los Términos</h2>
        <p className="mt-3 leading-relaxed">
          Prescribe tu Multa se reserva el derecho de modificar estos términos y condiciones en cualquier momento. Los cambios serán efectivos inmediatamente al ser publicados en esta página.
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
