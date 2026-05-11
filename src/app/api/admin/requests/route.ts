import { NextRequest, NextResponse } from 'next/server';
import { fetchUnifiedRequests } from '@/lib/admin/payment-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 10;

    const { data, total, pages } = await fetchUnifiedRequests({ statusFilter, search, page, limit });

    return NextResponse.json({
      ok: true,
      data,
      requests: data,
      pagination: { page, limit, total, pages },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching requests';
    console.error('[api/admin/requests] Error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
