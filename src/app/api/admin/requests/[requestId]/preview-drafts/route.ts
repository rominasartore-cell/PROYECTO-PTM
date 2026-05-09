import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePrescriptionRequestDrafts } from '@/lib/document-generation';
import type { AnalysisResult } from '@/lib/prescripcion-rmnp/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: 'Falta el ID de solicitud' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_requests')
      .select('raw_analysis_json')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('[preview-drafts] DB error:', error);
      return NextResponse.json(
        { ok: false, error: 'Error al consultar la solicitud' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    const raw = data.raw_analysis_json as Record<string, unknown> | null;

    if (!raw || !Array.isArray(raw.fines)) {
      return NextResponse.json(
        { ok: false, error: 'No hay datos de análisis disponibles para generar borradores.' },
        { status: 422 }
      );
    }

    const drafts = generatePrescriptionRequestDrafts(raw as unknown as AnalysisResult);

    return NextResponse.json({ ok: true, drafts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    console.error('[preview-drafts] Error:', err);
    return NextResponse.json(
      { ok: false, error: `Error al generar borradores: ${msg}` },
      { status: 500 }
    );
  }
}
