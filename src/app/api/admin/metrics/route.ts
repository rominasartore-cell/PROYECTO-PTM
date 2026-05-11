import { NextResponse } from 'next/server';
import { fetchAdminMetrics } from '@/lib/admin/payment-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await fetchAdminMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching metrics';
    console.error('[api/admin/metrics] Error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
