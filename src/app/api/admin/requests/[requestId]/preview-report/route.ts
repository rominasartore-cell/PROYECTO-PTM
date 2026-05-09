import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePrescriptionReport } from '@/lib/document-generation';
import type { AnalysisResult } from '@/lib/prescripcion-rmnp/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

const errorHtml = (msg: string, status: number) =>
  new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body style="font-family:sans-serif;padding:2rem;color:#333"><h2>Error</h2><p>${msg}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return errorHtml('Falta el ID de solicitud.', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_requests')
      .select('raw_analysis_json')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('[preview-report] DB error:', error);
      return errorHtml('Error al consultar la solicitud.', 500);
    }

    if (!data) {
      return errorHtml('Solicitud no encontrada.', 404);
    }

    const raw = data.raw_analysis_json as Record<string, unknown> | null;

    if (!raw || !Array.isArray(raw.fines)) {
      return errorHtml(
        'No hay datos de análisis disponibles para generar el informe. El análisis debe haberse completado primero.',
        422
      );
    }

    const html = generatePrescriptionReport(raw as unknown as AnalysisResult);

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    console.error('[preview-report] Error:', err);
    return errorHtml(`Error al generar el informe: ${msg}`, 500);
  }
}
