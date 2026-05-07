import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;

    const { data: request_data, error: requestError } = await supabaseAdmin
      .from('analysis_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (requestError || !request_data) {
      return NextResponse.json(
        { ok: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const { data: notes, error: notesError } = await supabaseAdmin
      .from('admin_notes')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ok: true,
      data: request_data,
      notes: notes || [],
    });
  } catch (error: any) {
    console.error('[api/admin/requests/[requestId]] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error fetching request' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const body = await request.json();

    const { status, internal_notes } = body;

    const updateData: any = { updated_at: new Date().toISOString() };

    if (status) {
      updateData.status = status;
    }

    if (internal_notes !== undefined) {
      updateData.internal_notes = internal_notes;
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_requests')
      .update(updateData)
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error('[api/admin/requests/[requestId] PATCH] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error updating request' },
      { status: 500 }
    );
  }
}
