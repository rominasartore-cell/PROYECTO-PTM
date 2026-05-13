import InformationPageLayout from "@/components/ptm/InformationPageLayout";

export const metadata = {
  title: "Política de Privacidad | Prescribe tu Multa",
  description: "Política de privacidad y protección de datos de Prescribe tu Multa",
};

export default function PoliticaDePrivacidad() {
  return (
    <InformationPageLayout
      title="Política de Privacidad"
      subtitle="Cómo protegemos tus datos personales"
    >
      <section>
        <h2 className="text-2xl font-black">1. Información que Recopilamos</h2>
        <p className="mt-3 leading-relaxed">
          Al usar Prescribe tu Multa, recopilamos:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li><strong>Nombre completo:</strong> Para identificar al usuario en el análisis.</li>
          <li><strong>Correo electrónico:</strong> Para enviar el informe y mantener contacto.</li>
          <li><strong>Patente del vehículo:</strong> Para correlacionar multas en el certificado.</li>
          <li><strong>Certificado PDF:</strong> El documento que cargas para análisis.</li>
          <li><strong>Información de pago:</strong> Si realizas una compra.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">2. Cómo Usamos tus Datos</h2>
        <p className="mt-3 leading-relaxed">
          Utilizamos tus datos exclusivamente para:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Analizar tu certificado de multas.</li>
          <li>Generar tu informe preliminar y completo.</li>
          <li>Enviar documentos al correo proporcionado.</li>
          <li>Procesar transacciones de pago.</li>
          <li>Proporcionar soporte técnico en caso de problemas.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">3. Compartición de Información</h2>
        <p className="mt-3 leading-relaxed">
          <strong>No compartimos tus datos personales con terceros</strong>, excepto en los siguientes casos:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Cuando sea requerido por ley o una orden judicial.</li>
          <li>Con proveedores de servicios técnicos (hosting, email) bajo acuerdos de confidencialidad.</li>
          <li>Con plataformas de pago (Mercado Pago) solo para procesar pagos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">4. Seguridad de tus Datos</h2>
        <p className="mt-3 leading-relaxed">
          Implementamos medidas de seguridad técnicas para proteger tu información:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Conexiones encriptadas (HTTPS).</li>
          <li>Acceso restringido a datos personales.</li>
          <li>Almacenamiento seguro en servidores certificados.</li>
          <li>Eliminación de archivos después de un período razonable.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">5. Retención de Datos</h2>
        <p className="mt-3 leading-relaxed">
          Retenemos tus datos personales durante el tiempo necesario para:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Generar y enviar tu informe.</li>
          <li>Procesar reembolsos o reenvíos (si aplica).</li>
          <li>Cumplir obligaciones legales (máximo 2 años).</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Después de este período, los datos serán eliminados de forma segura.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">6. Tus Derechos</h2>
        <p className="mt-3 leading-relaxed">
          Tienes derecho a:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Acceder a tus datos personales.</li>
          <li>Rectificar información inexacta.</li>
          <li>Solicitar la eliminación de tus datos.</li>
          <li>Retractarte del consentimiento (aunque esto podría limitar el servicio).</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Para ejercer estos derechos, contacta a través de nuestro formulario de contacto.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">7. Cookies y Tecnologías de Rastreo</h2>
        <p className="mt-3 leading-relaxed">
          Utilizamos cookies únicamente para:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-6">
          <li>Mantener sesiones de usuario (técnicamente necesario).</li>
          <li>Recordar tus preferencias.</li>
          <li>Análisis anónimo de uso del sitio.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          No usamos rastreo para publicidad dirigida.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">8. Cambios en esta Política</h2>
        <p className="mt-3 leading-relaxed">
          Nos reservamos el derecho de actualizar esta política en cualquier momento. Notificaremos cambios materiales mediante correo o un aviso en el sitio.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black">9. Contacto</h2>
        <p className="mt-3 leading-relaxed">
          Si tienes preguntas sobre esta política de privacidad, contacta con nosotros a través del formulario de contacto en nuestro sitio.
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
