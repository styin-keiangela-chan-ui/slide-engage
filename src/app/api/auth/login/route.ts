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

function bearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function createSessionResponse(lecturer: any) {
  const token = jwt.sign(
    { sub: lecturer.id, email: lecturer.email, role: 'lecturer' },
    getJwtSecret(),
    { expiresIn: '7d', issuer: 'slideengage' }
  );

  const { password_hash, ...safe } = lecturer;
  const response = NextResponse.json({
    lecturer: safe,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

async function lecturerFromSupabaseSession(req: NextRequest, email: string) {
  const token = bearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  const authEmail = data.user?.email;
  if (error || !authEmail) {
    throw new Error(error?.message || 'Invalid Supabase session');
  }
  if (authEmail.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Supabase session email does not match login email');
  }

  const { data: existing } = await supabase
    .from('lecturers')
    .select('*')
    .eq('email', authEmail)
    .single();

  if (existing) return existing;

  const displayName =
    (data.user?.user_metadata?.name as string | undefined) ||
    (data.user?.user_metadata?.full_name as string | undefined) ||
    authEmail.split('@')[0] ||
    'Lecturer';
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
  const { data: lecturer, error: insertError } = await supabase
    .from('lecturers')
    .insert({ email: authEmail, name: displayName, password_hash: passwordHash })
    .select()
    .single();

  if (insertError || !lecturer) {
    throw new Error(insertError?.message || 'Unable to create lecturer profile');
  }

  return lecturer;
}

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

    const supabaseLecturer = await lecturerFromSupabaseSession(req, email);
    if (supabaseLecturer) {
      return createSessionResponse(supabaseLecturer);
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

    return createSessionResponse(lecturer);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
