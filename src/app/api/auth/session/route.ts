import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COOKIE_NAME = 'slideengage_session';

type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  exp?: number;
};

function clearSessionResponse(status = 401) {
  const response = NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return clearSessionResponse();

    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: 'slideengage',
    }) as SessionPayload;

    if (!payload?.sub || payload.role !== 'lecturer') return clearSessionResponse();

    const { data: lecturer, error } = await supabase
      .from('lecturers')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (error || !lecturer) return clearSessionResponse();

    const { password_hash, ...safe } = lecturer;
    return NextResponse.json({
      lecturer: safe,
      expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    });
  } catch {
    return clearSessionResponse();
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
