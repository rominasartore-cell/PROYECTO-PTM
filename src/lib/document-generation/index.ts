import { AnalysisResult, Fine } from '@/lib/prescripcion-rmnp';

export function generatePrescriptionReport(analysis: AnalysisResult): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Informe de PrescripciÃ³n - ${analysis.certificate.vehiclePlateNormalized}</title>
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
    <h1>âš–ï¸ Informe de PrescripciÃ³n de Multas de TrÃ¡nsito</h1>
    <p><strong>Patente:</strong> ${analysis.certificate.vehiclePlateNormalized}</p>
    <p><strong>Fecha de EmisiÃ³n del Certificado:</strong> ${analysis.certificate.issueDate}</p>
    <p><strong>Referencia de Solicitud:</strong> ${analysis.requestId}</p>
    <p><strong>Fecha de AnÃ¡lisis:</strong> ${new Date(analysis.extractedAt).toLocaleDateString('es-CL')}</p>
  </div>

  <div class="section summary-box">
    <h2>ðŸ“Š Resumen</h2>
    <p><strong>Total de multas detectadas:</strong> ${analysis.summary.totalFines}</p>
    <p><strong>Multas potencialmente prescritas:</strong> <span style="color: #059669; font-weight: bold;">${analysis.summary.prescribedCount}</span></p>
    <p><strong>Multas no prescritas:</strong> <span style="color: #dc2626; font-weight: bold;">${analysis.summary.notPrescribedCount}</span></p>
    <p><strong>Multas que requieren revisiÃ³n:</strong> <span style="color: #d97706; font-weight: bold;">${analysis.summary.reviewCount}</span></p>
    <p><strong>Monto total:</strong> ${analysis.summary.totalAmount !== null ? `$${analysis.summary.totalAmount.toLocaleString('es-CL')}` : 'N/A'}</p>
    <p><strong>Monto potencialmente prescrito:</strong> <span style="color: #059669; font-weight: bold;">${analysis.summary.prescribedAmount !== null ? `$${analysis.summary.prescribedAmount.toLocaleString('es-CL')}` : 'N/A'}</span></p>
  </div>

  ${analysis.warnings.length > 0 ? `
  <div class="section disclaimer">
    <h3>âš ï¸ Advertencias</h3>
    <ul>
      ${analysis.warnings.map(w => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <h2>ðŸ“‹ Detalle de Multas</h2>
    <table>
      <thead>
        <tr>
          <th>ID Multa</th>
          <th>InfracciÃ³n</th>
          <th>Tribunal</th>
          <th>AÃ±o ROL</th>
          <th>Fecha Ingreso RMNP</th>
          <th>AÃ±os Transcurridos</th>
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
            <td><strong>${fine.prescriptionStatus === 'PRESCRITA' ? 'âœ… PRESCRITA' : fine.prescriptionStatus === 'NO_PRESCRITA' ? 'âŒ NO PRESCRITA' : 'âš ï¸ REVISIÃ“N'}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>ðŸ“Œ MetodologÃ­a</h2>
    <p>Este anÃ¡lisis se basa en la normativa de prescripciÃ³n de multas de trÃ¡nsito en Chile, donde una multa se considera prescrita si han transcurrido <strong>3 aÃ±os o mÃ¡s</strong> desde su ingreso al Registro de Multas de TrÃ¡nsito No Pagadas (RMNP).</p>
    <p>La prescripciÃ³n es un mecanismo legal que extingue la obligaciÃ³n de pago despuÃ©s de cierto tiempo sin ejercicio del derecho.</p>
  </div>

  <div class="section disclaimer">
    <h3>âš ï¸ Importante - ExenciÃ³n de Responsabilidad</h3>
    <p>Este informe es de carÃ¡cter informativo y preliminar. <strong>No constituye asesoramiento legal</strong>. La decisiÃ³n final sobre la prescripciÃ³n de una multa corresponde exclusivamente al tribunal competente.</p>
    <p>Se recomienda:</p>
    <ul>
      <li>Consultar con un abogado especializado antes de presentar cualquier solicitud</li>
      <li>Verificar la informaciÃ³n con los documentos originales</li>
      <li>Considerar los plazos de presentaciÃ³n segÃºn cada tribunal</li>
    </ul>
  </div>

  <div class="footer">
    <p>Informe generado por Prescribe Tu Multa - ${new Date().toLocaleDateString('es-CL')}</p>
    <p>Â© 2026 Prescribe Tu Multa. Todos los derechos reservados.</p>
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
    const multas = fines.map(f => `â€¢ ${f.infraction} (Rol: ${f.rol}/${f.rolYear})`).join('\n');

    const draft = `
JUZGADO DE POLICÃA LOCAL
${court}

SOLICITUD DE PRESCRIPCIÃ“N DE MULTA(S)

Patente: ${analysis.certificate.vehiclePlateNormalized}
Propietario: ${analysis.certificate.ownerName || '[Nombre del propietario]'}
R.U.N.: ${analysis.certificate.ownerRun || '[RUN del propietario]'}

ANTECEDENTES:

He tenido constancia de que en mi contra existen registro(s) de multa(s) de trÃ¡nsito en el Registro de Multas de TrÃ¡nsito No Pagadas (RMNP). EspecÃ­ficamente, las siguientes:

${multas}

HECHOS:

Conforme a los antecedentes que acompaÃ±an, estas multas fueron ingresadas al RMNP hace mÃ¡s de tres (3) aÃ±os, por lo que se encuentran prescritas conforme a lo establecido en la normativa vigente.

DERECHO:

La prescripciÃ³n es un mecanismo legal que extingue la obligaciÃ³n de pago despuÃ©s de cierto tiempo sin ejercicio del derecho. En el caso de las multas de trÃ¡nsito, el plazo de prescripciÃ³n es de tres (3) aÃ±os contados desde el ingreso a RMNP.

Conforme a los documentos acompaÃ±ados, las multas identificadas cumplen con este requisito.

PETITORIO:

Por lo anterior, solicitito a S.S. tenga por prescrita(s) la(s) siguiente(s) multa(s):
${fines.map(f => `- Rol: ${f.rol}/${f.rolYear} (InfracciÃ³n: ${f.infraction})`).join('\n')}

Se acompaÃ±a certificado de multas no pagadas como respaldo de lo solicitado.

Respetuosamente,

_______________________________
[Nombre y firma del propietario]

Fecha: ${new Date().toLocaleDateString('es-CL')}
    `;

    drafts[`solicitud_${court.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`] = draft;
  });

  if (Object.keys(drafts).length === 0) {
    drafts['_info.txt'] = 'No hay multas prescritas en este anÃ¡lisis. Las solicitudes de prescripciÃ³n se generan solo para multas con estado PRESCRITA.';
  }

  return drafts;
}

