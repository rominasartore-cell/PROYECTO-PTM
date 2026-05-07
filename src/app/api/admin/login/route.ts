import { NextRequest, NextResponse } from 'next/server';
import { validateAdminLogin, createAdminSessionToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    const isValid = validateAdminLogin(username, password);

    if (!isValid) {
      // Don't reveal if username or password is wrong
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();

    const response = NextResponse.json({
      ok: true,
      token,
      message: 'Login successful',
    });

    response.cookies.set('ptm-admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('[api/admin/login] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Login error' },
      { status: 500 }
    );
  }
}
