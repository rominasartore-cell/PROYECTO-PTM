import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { requestId } = await context.params;
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Note is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdminAdmin
      .from('admin_notes')
      .insert([
        {
          request_id: requestId,
          note: note.trim(),
          created_at: new Date().toISOString(),
        },
      ])
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
    console.error('[api/admin/requests/[requestId]/notes] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error adding note' },
      { status: 500 }
    );
  }
}
