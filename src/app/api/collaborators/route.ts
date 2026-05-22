import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, lecturers(id, email, name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collaborators: data || [] });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
