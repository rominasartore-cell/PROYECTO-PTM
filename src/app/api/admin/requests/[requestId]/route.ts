import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    if (!requestId) {
      return NextResponse.json({ ok: false, error: 'Missing requestId' }, { status: 400 });
    }

    // 1. Try analysis_requests first
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('analysis_requests')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (requestError) {
      console.error('[api/admin/requests/[requestId]] DB error:', requestError);
      return NextResponse.json({ ok: false, error: requestError.message }, { status: 500 });
    }

    // 2. Fetch matching ptm_payments row (if any)
    const { data: paymentData } = await supabaseAdmin
      .from('ptm_payments')
      .select('*')
      .eq('external_reference', requestId)
      .maybeSingle();

    if (!requestData && !paymentData) {
      return NextResponse.json({ ok: false, error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // 3. Fetch notes (only applicable when analysis row exists)
    const { data: notes } = requestData
      ? await supabaseAdmin
          .from('admin_notes')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
      : { data: [] };

    // 4. Build unified response
    let mergedRequest: Record<string, unknown>;

    if (requestData) {
      mergedRequest = {
        ...requestData,
        source: 'analysis',
        preference_id: paymentData?.preference_id ?? null,
        payment_id: paymentData?.payment_id ?? null,
        payment_amount: paymentData?.amount ?? null,
        is_mock: paymentData?.is_mock ?? false,
        is_sandbox: paymentData?.is_sandbox ?? false,
        has_supabase_payment: !!paymentData,
        // ptm_payments status takes precedence for payment_status
        payment_status: resolvePaymentStatus(requestData.payment_status, paymentData?.status ?? null, !!paymentData),
      };
    } else {
      // Orphan payment: build synthetic row from ptm_payments
      mergedRequest = {
        id: paymentData!.id,
        request_id: paymentData!.external_reference || paymentData!.id,
        source: 'payment_only',
        customer_name: paymentData!.payer_name ?? null,
        customer_email: paymentData!.payer_email ?? null,
        vehicle_plate: paymentData!.plate ?? null,
        status: null,
        fine_count: null,
        prescribed_count: null,
        total_amount_utm: null,
        utm_value_clp: null,
        raw_analysis_json: null,
        internal_notes: null,
        pdf_path: null,
        pdf_filename: null,
        pdf_url: null,
        payment_status: resolvePaymentStatus(null, paymentData!.status, true),
        preference_id: paymentData!.preference_id ?? null,
        payment_id: paymentData!.payment_id ?? null,
        payment_amount: paymentData!.amount ?? null,
        is_mock: paymentData!.is_mock,
        is_sandbox: paymentData!.is_sandbox,
        has_supabase_payment: true,
        created_at: paymentData!.created_at,
        updated_at: paymentData!.updated_at ?? null,
      };
    }

    return NextResponse.json({
      ok: true,
      request: mergedRequest,
      data: mergedRequest,
      notes: notes || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching request';
    console.error('[api/admin/requests/[requestId]] Error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

function resolvePaymentStatus(
  analysisStatus: string | null,
  ptmStatus: string | null,
  hasPtm: boolean
): string | null {
  if (hasPtm && ptmStatus) {
    if (ptmStatus === 'approved') return 'approved';
    if (['rejected', 'cancelled', 'failed'].includes(ptmStatus)) return 'rejected';
    if (['created', 'pending', 'processing'].includes(ptmStatus)) return 'pending';
  }
  if (analysisStatus) {
    if (analysisStatus === 'approved') return 'approved';
    if (['failed', 'rejected'].includes(analysisStatus)) return 'rejected';
    if (analysisStatus === 'pending') return 'pending';
  }
  return null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const body = await request.json();

    if (!requestId) {
      return NextResponse.json({ ok: false, error: 'Missing requestId' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.status === 'string') updateData.status = body.status;
    if (typeof body.payment_status === 'string') updateData.payment_status = body.payment_status;
    if (typeof body.internal_notes === 'string') updateData.internal_notes = body.internal_notes;

    const { data: updatedRequest, error } = await supabaseAdmin
      .from('analysis_requests')
      .update(updateData)
      .eq('request_id', requestId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[api/admin/requests/[requestId] PATCH] Error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!updatedRequest) {
      return NextResponse.json({ ok: false, error: 'Solicitud no encontrada en analysis_requests' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, request: updatedRequest, data: updatedRequest });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating request';
    console.error('[api/admin/requests/[requestId] PATCH] Error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
