import { AnalysisResult, Fine } from '@/lib/prescripcion-rmnp';

export function generatePrescriptionReport(analysis: AnalysisResult): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Informe de Prescripción - ${analysis.certificate.vehiclePlateNormalized}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e3a5f; margin: 0; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section h2 { color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .prescribed { background-color: #d1fae5; }
    .not-prescribed { background-color: #fee2e2; }
    .review { background-color: #fef3c7; }
    .summary-box { background-color: #eff6ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 5px; }
    .disclaimer { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚖️ Informe de Prescripción de Multas de Tránsito</h1>
    <p><strong>Patente:</strong> ${analysis.certificate.vehiclePlateNormalized}</p>
    <p><strong>Fecha de Emisión del Certificado:</strong> ${analysis.certificate.issueDate}</p>
    <p><strong>Referencia de Solicitud:</strong> ${analysis.requestId}</p>
    <p><strong>Fecha de Análisis:</strong> ${new Date(analysis.extractedAt).toLocaleDateString('es-CL')}</p>
  </div>

  <div class="section summary-box">
    <h2>📊 Resumen</h2>
    <p><strong>Total de multas detectadas:</strong> ${analysis.summary.totalFines}</p>
    <p><strong>Multas potencialmente prescritas:</strong> <span style="color: #059669; font-weight: bold;">${analysis.summary.prescribedCount}</span></p>
    <p><strong>Multas no prescritas:</strong> <span style="color: #dc2626; font-weight: bold;">${analysis.summary.notPrescribedCount}</span></p>
    <p><strong>Multas que requieren revisión:</strong> <span style="color: #d97706; font-weight: bold;">${analysis.summary.reviewCount}</span></p>
    <p><strong>Monto total:</strong> ${analysis.summary.totalAmount !== null ? `$${analysis.summary.totalAmount.toLocaleString('es-CL')}` : 'N/A'}</p>
    <p><strong>Monto potencialmente prescrito:</strong> <span style="color: #059669; font-weight: bold;">${analysis.summary.prescribedAmount !== null ? `$${analysis.summary.prescribedAmount.toLocaleString('es-CL')}` : 'N/A'}</span></p>
  </div>

  ${analysis.warnings.length > 0 ? `
  <div class="section disclaimer">
    <h3>Advertencias</h3>
    <ul>
      ${analysis.warnings.map(w => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <h2>📋 Detalle de Multas</h2>
    <table>
      <thead>
        <tr>
          <th>ID Multa</th>
          <th>Infracción</th>
          <th>Tribunal</th>
          <th>Año ROL</th>
          <th>Fecha Ingreso RMNP</th>
          <th>Años Transcurridos</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${analysis.fines.map(fine => `
          <tr class="${fine.prescriptionStatus === 'PRESCRITA' ? 'prescribed' : fine.prescriptionStatus === 'NO_PRESCRITA' ? 'not-prescribed' : 'review'}">
            <td>${fine.id}</td>
            <td>${fine.infraction}</td>
            <td>${fine.court}</td>
            <td>${fine.rolYear}</td>
            <td>${fine.rmnpEntryDate || '-'}</td>
            <td>${fine.yearsElapsed ? fine.yearsElapsed.toFixed(2) : '-'}</td>
            <td><strong>${fine.prescriptionStatus === 'PRESCRITA' ? '✅ PRESCRITA' : fine.prescriptionStatus === 'NO_PRESCRITA' ? '❌ NO PRESCRITA' : 'REVISIÓN'}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>📌 Metodología</h2>
    <p>Este análisis se basa en la normativa de prescripción de multas de tránsito en Chile, donde una multa se considera prescrita si han transcurrido <strong>3 años o más</strong> desde su ingreso al Registro de Multas de Tránsito No Pagadas (RMNP).</p>
    <p>La prescripción es un mecanismo legal que extingue la obligación de pago después de cierto tiempo sin ejercicio del derecho.</p>
  </div>

  <div class="section disclaimer">
    <h3>Importante - Exención de Responsabilidad</h3>
    <p>Este informe es de carácter informativo y preliminar. <strong>No constituye asesoramiento legal</strong>. La decisión final sobre la prescripción de una multa corresponde exclusivamente al tribunal competente.</p>
    <p>Se recomienda:</p>
    <ul>
      <li>Consultar con un abogado especializado antes de presentar cualquier solicitud</li>
      <li>Verificar la información con los documentos originales</li>
      <li>Considerar los plazos de presentación según cada tribunal</li>
    </ul>
  </div>

  <div class="footer">
    <p>Informe generado por Prescribe Tu Multa - ${new Date().toLocaleDateString('es-CL')}</p>
    <p>© 2026 Prescribe Tu Multa. Todos los derechos reservados.</p>
  </div>
</body>
</html>
  `;

  return html;
}

export function generatePrescriptionRequestDrafts(analysis: AnalysisResult): Record<string, string> {
  const drafts: Record<string, string> = {};

  const prescribedByCourtMap = new Map<string, Fine[]>();

  analysis.fines.forEach(fine => {
    if (fine.prescriptionStatus === 'PRESCRITA') {
      const court = fine.court || 'Tribunal no especificado';
      if (!prescribedByCourtMap.has(court)) {
        prescribedByCourtMap.set(court, []);
      }
      prescribedByCourtMap.get(court)!.push(fine);
    }
  });

  prescribedByCourtMap.forEach((fines, court) => {
    const rolesStr = fines.map(f => `${f.rol}/${f.rolYear}`).join(', ');
    const multas = fines.map(f => `• ${f.infraction} (Rol: ${f.rol}/${f.rolYear})`).join('\n');

    const draft = `
JUZGADO DE POLICÍA LOCAL
${court}

SOLICITUD DE PRESCRIPCIÓN DE MULTA(S)

Patente: ${analysis.certificate.vehiclePlateNormalized}
Propietario: ${analysis.certificate.ownerName || '[Nombre del propietario]'}
R.U.N.: ${analysis.certificate.ownerRun || '[RUN del propietario]'}

ANTECEDENTES:

He tenido constancia de que en mi contra existen registro(s) de multa(s) de tránsito en el Registro de Multas de Tránsito No Pagadas (RMNP). Específicamente, las siguientes:

${multas}

HECHOS:

Conforme a los antecedentes que acompañan, estas multas fueron ingresadas al RMNP hace más de tres (3) años, por lo que se encuentran prescritas conforme a lo establecido en la normativa vigente.

DERECHO:

La prescripción es un mecanismo legal que extingue la obligación de pago después de cierto tiempo sin ejercicio del derecho. En el caso de las multas de tránsito, el plazo de prescripción es de tres (3) años contados desde el ingreso a RMNP.

Conforme a los documentos acompañados, las multas identificadas cumplen con este requisito.

PETITORIO:

Por lo anterior, solicitito a S.S. tenga por prescrita(s) la(s) siguiente(s) multa(s):
${fines.map(f => `- Rol: ${f.rol}/${f.rolYear} (Infracción: ${f.infraction})`).join('\n')}

Se acompaña certificado de multas no pagadas como respaldo de lo solicitado.

Respetuosamente,

_______________________________
[Nombre y firma del propietario]

Fecha: ${new Date().toLocaleDateString('es-CL')}
    `;

    drafts[`solicitud_${court.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`] = draft;
  });

  if (Object.keys(drafts).length === 0) {
    drafts['_info.txt'] = 'No hay multas prescritas en este análisis. Las solicitudes de prescripción se generan solo para multas con estado PRESCRITA.';
  }

  return drafts;
}

