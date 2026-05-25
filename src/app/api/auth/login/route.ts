import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COOKIE_NAME = 'slideengage_session';

async function legacySha256(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: lecturer, error } = await supabase
      .from('lecturers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !lecturer) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let validPassword = await bcrypt.compare(password, lecturer.password_hash || '');

    if (!validPassword) {
      const legacyHash = await legacySha256(password);
      validPassword = legacyHash === lecturer.password_hash;

      if (validPassword) {
        const upgradedHash = await bcrypt.hash(password, 12);
        await supabase.from('lecturers').update({ password_hash: upgradedHash }).eq('id', lecturer.id);
      }
    }

    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = jwt.sign(
      { sub: lecturer.id, email: lecturer.email, role: 'lecturer' },
      getJwtSecret(),
      { expiresIn: '7d', issuer: 'slideengage' }
    );

    const { password_hash, ...safe } = lecturer;
    const response = NextResponse.json({ lecturer: safe });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
