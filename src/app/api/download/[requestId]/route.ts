import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  generatePrescriptionReport,
  generatePrescriptionRequestDrafts,
} from '@/lib/document-generation';
import type { AnalysisResult } from '@/lib/prescripcion-rmnp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : '';
}

function esc(s: string | null | undefined): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatCLP(value: number): string {
  return value.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return Response.json({ ok: false, error: 'Falta el ID de solicitud' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_requests')
      .select(
        'customer_name, customer_email, vehicle_plate, fine_count, prescribed_count, total_amount_utm, utm_value_clp, raw_analysis_json'
      )
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('[download] DB error:', error);
      return Response.json({ ok: false, error: 'Error al consultar la solicitud' }, { status: 500 });
    }

    if (!data) {
      return Response.json({ ok: false, error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const raw = data.raw_analysis_json as Record<string, unknown> | null;

    if (!raw || !Array.isArray(raw.fines)) {
      return Response.json(
        { ok: false, error: 'No hay análisis disponible para generar el documento.' },
        { status: 422 }
      );
    }

    const analysis = raw as unknown as AnalysisResult;

    // Reuse existing generation functions
    const reportBody = extractBodyContent(generatePrescriptionReport(analysis));
    const drafts = generatePrescriptionRequestDrafts(analysis);

    const montoCLP =
      Number(data.total_amount_utm || 0) * Number(data.utm_value_clp || 0);

    const safeFilename = (data.vehicle_plate || requestId)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    const generatedAt = new Date().toLocaleString('es-CL');

    const draftsHtml = Object.entries(drafts)
      .map(
        ([filename, content]) => `
        <div class="draft-block">
          <h3 class="draft-title">${esc(filename.replace(/_/g, ' '))}</h3>
          <pre class="draft-pre">${esc(content)}</pre>
        </div>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Informe Completo — ${esc(data.vehicle_plate || requestId)}</title>
  <style>
    /* Base */
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    /* Portada */
    .cover { text-align: center; padding: 60px 20px 40px; border-bottom: 3px solid #1e3a5f; margin-bottom: 48px; page-break-after: always; }
    .cover h1 { color: #1e3a5f; font-size: 22px; margin: 0 0 8px; }
    .cover h2 { color: #555; font-size: 15px; font-weight: normal; margin: 0 0 32px; }
    .cover-table { display: inline-block; text-align: left; background: #f5f5f5; border: 1px solid #ddd; padding: 20px 32px; border-radius: 6px; }
    .cover-table p { margin: 5px 0; font-size: 14px; }
    .cover-table strong { display: inline-block; min-width: 150px; color: #1e3a5f; }
    .cover-ref { margin-top: 24px; font-size: 11px; color: #888; font-style: italic; }
    /* Section headers */
    .section-header { color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 14px; margin: 40px 0 16px; font-size: 18px; }
    /* Summary grid */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 8px; }
    .summary-card { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 6px; }
    .summary-card .lbl { font-size: 12px; color: #555; margin-bottom: 4px; }
    .summary-card .val { font-size: 22px; font-weight: bold; color: #1e3a5f; }
    .summary-card .val.green { color: #059669; }
    .summary-card .val.blue  { color: #2563eb; }
    .summary-note { font-size: 11px; color: #666; margin-top: 6px; }
    /* Report styles (from generatePrescriptionReport) */
    .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e3a5f; margin: 0; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section h2 { color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .prescribed     { background-color: #d1fae5; }
    .not-prescribed { background-color: #fee2e2; }
    .review         { background-color: #fef3c7; }
    .summary-box  { background-color: #eff6ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 5px; }
    .disclaimer   { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer       { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
    /* Drafts */
    .draft-block { margin-bottom: 28px; page-break-inside: avoid; }
    .draft-title { color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 6px; font-size: 15px; }
    .draft-pre   { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; background: #f9f9f9; padding: 16px; border: 1px solid #e5e7eb; border-radius: 4px; margin: 0; }
    /* Limitations */
    .limitations { background: #fff7ed; border: 2px solid #f97316; padding: 20px 24px; border-radius: 6px; margin: 32px 0; }
    .limitations h2 { color: #c2410c; margin: 0 0 12px; font-size: 16px; }
    .limitations ul { margin: 0; padding-left: 20px; }
    .limitations li { margin-bottom: 8px; font-size: 14px; }
    /* Print */
    @media print {
      .cover { page-break-after: always; }
      .section, .draft-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- PORTADA -->
  <div class="cover">
    <h1>⚖️ Informe Completo de Análisis + Borradores de Escritos</h1>
    <h2>Solicitud de prescripción de multas de tránsito</h2>
    <div class="cover-table">
      <p><strong>Solicitante:</strong> ${esc(data.customer_name)}</p>
      <p><strong>Correo:</strong> ${esc(data.customer_email)}</p>
      <p><strong>Patente:</strong> ${esc(data.vehicle_plate)}</p>
      <p><strong>Fecha de generación:</strong> ${generatedAt}</p>
      <p><strong>Referencia:</strong> ${esc(requestId)}</p>
    </div>
    <p class="cover-ref">Este documento es de carácter referencial. No constituye asesoramiento legal.</p>
  </div>

  <!-- RESUMEN -->
  <h2 class="section-header">📊 Resumen del análisis</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="lbl">Total multas detectadas</div>
      <div class="val">${data.fine_count ?? '—'}</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Multas potencialmente prescritas</div>
      <div class="val green">${data.prescribed_count ?? '—'}</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Monto asociado (referencial)</div>
      <div class="val blue">${montoCLP > 0 ? formatCLP(montoCLP) : '—'}</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Valor UTM utilizado</div>
      <div class="val">${data.utm_value_clp ? formatCLP(data.utm_value_clp) : '—'}</div>
    </div>
  </div>
  <p class="summary-note">El monto es referencial. La prescripción extingue la obligación de pago; el monto no se descuenta automáticamente del RMNP.</p>

  <!-- INFORME DETALLADO -->
  <h2 class="section-header">📋 Informe detallado de prescripción</h2>
  ${reportBody}

  <!-- BORRADORES -->
  <h2 class="section-header" style="page-break-before:always;">✍️ Borradores de escritos por tribunal</h2>
  <p style="font-size:14px;color:#555;margin-bottom:20px;">Los siguientes borradores corresponden a multas identificadas como potencialmente prescritas, agrupadas por tribunal. Son modelos tipo que deben completarse con los datos del propietario antes de presentar.</p>
  ${draftsHtml}

  <!-- LIMITACIONES -->
  <div class="limitations">
    <h2>⚠️ Limitaciones y advertencias importantes</h2>
    <ul>
      <li>Este producto <strong>no garantiza</strong> resolución favorable del tribunal.</li>
      <li>La eliminación de multas del RMNP depende exclusivamente del tribunal competente y/o gestiones de la parte interesada.</li>
      <li>Es <strong>responsabilidad del solicitante</strong> presentar los escritos ante el tribunal que corresponda.</li>
      <li>Los escritos son modelos tipo. El tribunal podría exigir otras formalidades, documentos adicionales o un formato distinto.</li>
      <li>El análisis se realiza en base al certificado subido por el usuario. Su exactitud depende de la calidad y vigencia de dicho certificado.</li>
      <li>Este documento es informativo y <strong>no constituye asesoramiento legal</strong>. Se recomienda consultar con un abogado especializado antes de actuar.</li>
      <li>Prescribe Tu Multa no representa al usuario ante ningún tribunal ni ejerce patrocinio profesional.</li>
    </ul>
  </div>

  <div class="footer">
    <p>Generado por Prescribe Tu Multa — ${generatedAt}</p>
    <p>© 2026 Prescribe Tu Multa. Todos los derechos reservados. | soporte@prescribetumulta.cl</p>
  </div>

</div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="informe-prescripcion-${safeFilename}.html"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    console.error('[download] Error:', err);
    return Response.json(
      { ok: false, error: `Error al generar la descarga: ${msg}` },
      { status: 500 }
    );
  }
}
