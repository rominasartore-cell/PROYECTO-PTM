import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  sendClientAnalysisResults,
  sendClientResultsReady,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: 'Falta el ID de solicitud' },
        { status: 400 }
      );
    }

    const { data: req, error } = await supabaseAdmin
      .from('analysis_requests')
      .select('customer_name, customer_email, fine_count, prescribed_count, payment_status')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('[resend-email] DB error:', error);
      return NextResponse.json(
        { ok: false, error: 'Error al consultar la solicitud' },
        { status: 500 }
      );
    }

    if (!req) {
      return NextResponse.json(
        { ok: false, error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (!req.customer_email) {
      return NextResponse.json(
        { ok: false, error: 'La solicitud no tiene correo del cliente' },
        { status: 422 }
      );
    }

    if (req.fine_count == null) {
      return NextResponse.json(
        { ok: false, error: 'La solicitud no tiene resultados de análisis para enviar' },
        { status: 422 }
      );
    }

    const name = req.customer_name || 'Cliente';

    if (req.payment_status === 'approved') {
      await sendClientResultsReady({
        name,
        email: req.customer_email,
        requestId,
        downloadUrl: `/api/download/${requestId}`,
      });
    } else {
      await sendClientAnalysisResults({
        name,
        email: req.customer_email,
        requestId,
        prescribedCount: req.prescribed_count ?? 0,
        totalCount: req.fine_count,
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Correo reenviado correctamente',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reenviar el correo';
    console.error('[resend-email] Error:', err);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
