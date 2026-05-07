import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdminAdminAdminAdmin
      .from('analysis_requests')
      .select('status, payment_status');

    if (error) {
      console.error('[api/admin/metrics] Error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const requests = data || [];
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const paid = requests.filter((r) => r.status === 'paid').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    const paymentApproved = requests.filter((r) => r.payment_status === 'approved').length;

    return NextResponse.json({
      ok: true,
      metrics: {
        total,
        pending,
        approved,
        paid,
        rejected,
        paymentApproved,
      },
    });
  } catch (error: any) {
    console.error('[api/admin/metrics] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error fetching metrics' },
      { status: 500 }
    );
  }
}


