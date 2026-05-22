import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSessionToken } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/events/join — student joins an event
export async function POST(req: NextRequest) {
  try {
    const { event_code, display_name } = await req.json();

    if (!event_code) {
      return NextResponse.json({ error: 'Event code required' }, { status: 400 });
    }

    const code = event_code.toUpperCase().replace('#', '');

    // Find event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('event_code', code)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found. Check the code and try again.' }, { status: 404 });
    }

    if (event.status === 'closed' || event.status === 'archived') {
      return NextResponse.json({ error: 'This event has ended.' }, { status: 410 });
    }

    // Create participant
    const sessionToken = generateSessionToken();
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .insert({
        event_id: event.id,
        session_token: sessionToken,
        display_name: display_name || 'Anonymous',
      })
      .select()
      .single();

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    return NextResponse.json({ participant, event }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
